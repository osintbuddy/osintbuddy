CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Streams provide ordering and tenant/category scoping
CREATE TABLE IF NOT EXISTS event_streams (
  stream_id         uuid primary key,
  category          text not null,           -- e.g., 'entity', 'edge'
  key               text not null,           -- e.g., entity_id, edge_id, job_id
  created_at        timestamptz not null default now(),
  unique (category, key)
);


-- Append-only events
CREATE TABLE IF NOT EXISTS events (
  seq               bigserial primary key,   -- global order (HWM)
  stream_id         uuid not null references event_streams(stream_id) on delete cascade,
  version           int  not null,           -- per-stream version (optimistic concurrency)
  event_type        text not null,           -- e.g., 'entity:create', 'edge:create', etc
  payload           jsonb not null,
  -- Bi-temporal anchors: valid-time vs system-time
  valid_from        timestamptz not null,
  valid_to          timestamptz,
  recorded_at       timestamptz not null default now(), -- system time (tx-time)
  causation_id      uuid,                    -- event that caused this (optional)
  correlation_id    uuid,                    -- request/task correlation
  idempotency_key   text,                    -- dedupe external retries
  unique (stream_id, version),
  unique (idempotency_key)
);


-- Projection checkpoints (high-water marks)
CREATE TABLE IF NOT EXISTS event_checkpoints (
  projection_name   text primary key,
  last_seq          bigint not null default 0,
  updated_at        timestamptz not null default now()
);

-- Current entity state (document-y, Marten-style)
CREATE TABLE IF NOT EXISTS entities_current (
  entity_id   uuid primary key,
  doc         jsonb not null,             -- denormalized snapshot for reads
  valid_from  timestamptz not null,
  valid_to    timestamptz,                -- null => open-ended
  sys_from    timestamptz not null,       -- when projector wrote it
  sys_to      timestamptz                 -- superseded by projector
);

-- Edge materialization (graph-ish)
CREATE TABLE IF NOT EXISTS edges_current (
  edge_id     uuid primary key,
  src_id      uuid not null,
  dst_id      uuid not null,
  kind        text not null,
  props       jsonb not null default '{}'::jsonb,
  valid_from  timestamptz not null,
  valid_to    timestamptz,
  sys_from    timestamptz not null,
  sys_to      timestamptz
);

CREATE INDEX entities_current_doc_gin_idx ON entities_current USING gin (doc jsonb_path_ops);
CREATE INDEX ON edges_current(kind, src_id, dst_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'job_status'
  ) THEN
    CREATE TYPE job_status AS ENUM ('enqueued','leased','running','failed','completed','canceled','dead');
  END IF;
END$$;

-- worker jobs (sent to firecracker microVMs)
CREATE TABLE IF NOT EXISTS jobs (
  job_id         uuid primary key,
  kind           text not null,             -- e.g., 'http_scrape', 'yara_scan'
  payload        jsonb not null,
  status         job_status not null default 'enqueued',
  priority       int not null default 100,  -- lower = higher prio
  attempts       int not null default 0,
  max_attempts   int not null default 3,
  lease_owner    text,                      -- worker host pod/node id
  lease_until    timestamptz,               -- soft lease expiration
  created_at     timestamptz not null default now(),
  scheduled_at   timestamptz not null default now(),
  started_at     timestamptz,
  finished_at    timestamptz,
  backoff_until  timestamptz,
  idempotency_key text,
  unique (idempotency_key)
);

-- For structured outputs/binaries
CREATE TABLE IF NOT EXISTS artifacts (
  artifact_id   uuid primary key,
  job_id        uuid not null references jobs(job_id) on delete cascade,
  media_type    text not null default 'application/json',
  bytes         bytea,          -- small artifacts inline (<= 1-5MB)
  uri           text,           -- large artifacts offloaded (S3/minio/local fs)
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

-- Wake up listeners efficiently
CREATE OR REPLACE FUNCTION notify_jobs_new() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  perform pg_notify('jobs_new', '1');
  RETURN null;
END $$;


CREATE TRIGGER trg_jobs_new AFTER INSERT ON jobs
FOR EACH ROW EXECUTE FUNCTION notify_jobs_new();

-- tenant (aka teams) discriminator
CREATE TABLE IF NOT EXISTS organizations (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    website VARCHAR(255),
    contact_email VARCHAR(255),
    subscription_level VARCHAR(20) NOT NULL DEFAULT 'trial',
    max_users INTEGER NOT NULL DEFAULT 3,
    max_cases INTEGER NOT NULL DEFAULT 3,
    max_entities INTEGER NOT NULL DEFAULT 100,
    can_export BOOLEAN NOT NULL DEFAULT FALSE,
    can_share BOOLEAN NOT NULL DEFAULT FALSE,
    ctime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mtime TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX organizations_name_idx ON organizations (name);

-- osintbuddy members 
-- + every member has a default organization created with their name
-- + this is their default "team"
-- + TODO: create organization signup flow to allow
--         customizing initial organization details on new account
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    password VARCHAR(100) NOT NULL,
    user_type VARCHAR(20) NOT NULL DEFAULT 'standard',
    org_id BIGSERIAL NOT NULL,
    ctime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mtime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT valid_user_type CHECK (user_type IN (
      'standard', 'owner', 'moderator', 'sudo'
    ))
);
CREATE INDEX users_email_idx ON users (email);
CREATE INDEX users_org_id_idx ON users (org_id);

-- Cases are the reference to a specific set entities and their relationships
CREATE TABLE IF NOT EXISTS cases (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'private',
    org_id BIGSERIAL NOT NULL,
    ctime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mtime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_id BIGSERIAL NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL,
    CONSTRAINT valid_case_visibility CHECK (visibility IN ('private', 'organization', 'shared', 'public', 'restricted'))
);
CREATE INDEX cases_org_id_idx ON cases (org_id);

CREATE TABLE IF NOT EXISTS favorite_cases (
    case_id BIGSERIAL NOT NULL,
    owner_id BIGSERIAL NOT NULL,
    PRIMARY KEY (owner_id, case_id),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX favorite_cases_owner_id_idx ON favorite_cases (owner_id);

-- entity script source code, can be any language (Node/Python) as
-- long as some simple rules and data structures are followed
CREATE TABLE IF NOT EXISTS entities (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    author TEXT NOT NULL,
    source TEXT NOT NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'private',
    org_id BIGSERIAL NOT NULL,
    ctime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mtime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_id BIGSERIAL NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL,
    CONSTRAINT valid_entity_visibility CHECK (visibility IN ('private', 'organization', 'shared', 'public', 'restricted'))
);
CREATE INDEX entities_owner_id_idx ON entities (owner_id);
CREATE INDEX entities_shared_with_org_id_idx ON entities (org_id);

CREATE TABLE IF NOT EXISTS favorite_entities (
    entity_id BIGSERIAL NOT NULL,
    owner_id BIGSERIAL NOT NULL,
    PRIMARY KEY (owner_id, entity_id),
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX favorite_entities_owner_id_idx ON favorite_entities (owner_id);

-- abac 
CREATE TABLE IF NOT EXISTS resource_shares (
    id BIGSERIAL PRIMARY KEY,
    resource_type VARCHAR(40) NOT NULL,
    resource_id BIGSERIAL NOT NULL,
    shared_by_user_id BIGSERIAL NOT NULL,
    shared_with_user_id BIGSERIAL,
    org_id BIGSERIAL NOT NULL,
    access_level VARCHAR(20) NOT NULL DEFAULT 'read',
    expires_at TIMESTAMP WITH TIME ZONE,
    ctime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT valid_resource_type CHECK (resource_type IN ('case', 'entity', 'feed')),
    CONSTRAINT valid_access_level CHECK (access_level IN ('read', 'write', 'admin'))
    -- org_id is always required (NOT NULL), shared_with_user_id is optional
    -- When shared_with_user_id IS NULL, it means sharing with entire organization
    -- When shared_with_user_id IS NOT NULL, it means sharing with specific user in that organization
);
CREATE INDEX resource_shares_resource_idx ON resource_shares (resource_type, resource_id);
CREATE INDEX resource_shares_shared_with_user_idx ON resource_shares (shared_with_user_id);
CREATE INDEX resource_shares_org_id_idx ON resource_shares (org_id);
CREATE INDEX resource_shares_lookup_idx ON resource_shares (resource_type, resource_id, org_id);
  
CREATE TABLE IF NOT EXISTS access_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGSERIAL NOT NULL,
    resource_type VARCHAR(20) NOT NULL,
    resource_id BIGSERIAL NOT NULL,
    action VARCHAR(20) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    access_granted BOOLEAN NOT NULL,
    access_reason TEXT,
    ctime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT valid_resource_type CHECK (resource_type IN ('case', 'entity', 'feed')),
    CONSTRAINT valid_action CHECK (action IN ('create', 'read', 'update', 'delete', 'share', 'export'))
);
CREATE INDEX access_logs_user_id_idx ON access_logs (user_id);
CREATE INDEX access_logs_resource_idx ON access_logs (resource_type, resource_id);

-- case feed result
-- TODO: think this out more, want to support RSS, custom post feeds, etc
CREATE TABLE IF NOT EXISTS feeds (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    categories TEXT[] NOT NULL DEFAULT '{}',
    org_id BIGSERIAL NOT NULL,
    owner_id BIGSERIAL NOT NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'organization',
    ctime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mtime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT valid_feed_visibility CHECK (visibility IN ('private', 'organization', 'shared', 'public', 'restricted'))
);
CREATE INDEX feeds_org_id_idx ON feeds (org_id);
CREATE INDEX feeds_owner_id_idx ON feeds (owner_id);
CREATE INDEX feeds_categories_idx ON feeds USING GIN (categories);

-- feed posts
CREATE TABLE IF NOT EXISTS posts (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4(),
    feed_id BIGSERIAL NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_format VARCHAR(20) NOT NULL DEFAULT 'markdown',
    author_id BIGSERIAL NOT NULL,
    parent_post_id BIGSERIAL,
    ctime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mtime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT valid_content_format CHECK (content_format IN ('markdown', 'html', 'plain'))
);
CREATE INDEX posts_feed_id_idx ON posts (feed_id);
CREATE INDEX posts_author_id_idx ON posts (author_id);
CREATE INDEX posts_parent_post_id_idx ON posts (parent_post_id);

CREATE TABLE IF NOT EXISTS post_edit_history (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGSERIAL NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_format VARCHAR(20) NOT NULL DEFAULT 'markdown',
    edited_by BIGSERIAL NOT NULL,
    edit_reason TEXT,
    ctime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (edited_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT valid_edit_content_format CHECK (content_format IN ('markdown', 'html', 'plain'))
);
CREATE INDEX post_edit_history_post_id_idx ON post_edit_history (post_id);
CREATE INDEX post_edit_history_edited_by_idx ON post_edit_history (edited_by);

CREATE TABLE IF NOT EXISTS tags (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7),
    org_id BIGSERIAL NOT NULL,
    created_by BIGSERIAL NOT NULL,
    ctime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(name, org_id)
);
CREATE INDEX tags_org_id_idx ON tags (org_id);
CREATE INDEX tags_name_idx ON tags (name);

CREATE TABLE IF NOT EXISTS post_tags (
    post_id BIGSERIAL NOT NULL,
    tag_id BIGSERIAL NOT NULL,
    tagged_by BIGSERIAL NOT NULL,
    ctime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    FOREIGN KEY (tagged_by) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX post_tags_post_id_idx ON post_tags (post_id);
CREATE INDEX post_tags_tag_id_idx ON post_tags (tag_id);
