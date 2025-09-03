CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Streams provide ordering and tenant/category scoping
CREATE TABLE IF NOT EXISTS event_streams (
  stream_id         UUID PRIMARY KEY,
  category          TEXT NOT NULL,           -- e.g., 'entity', 'edge'
  key               TEXT NOT NULL,           -- e.g., entity_id, edge_id, job_id
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category, key)
);


-- Append-only events
CREATE TABLE IF NOT EXISTS events (
  seq               BIGSERIAL PRIMARY KEY,   -- global order (HWM)
  stream_id         UUID NOT NULL references event_streams(stream_id) on delete cascade,
  version           int  NOT NULL,           -- per-stream version (optimistic concurrency)
  event_type        TEXT NOT NULL,           -- e.g., 'entity:create', 'edge:create', etc
  payload           JSONB NOT NULL,
  -- Bi-temporal anchors: valid-time vs system-time
  valid_from        TIMESTAMPTZ NOT NULL,
  valid_to          TIMESTAMPTZ,
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now(), -- system time (tx-time)
  causation_id      UUID,                    -- event that caused this (optional)
  correlation_id    UUID,                    -- request/task correlation
  idempotency_key   TEXT,                    -- dedupe external retries
  UNIQUE (stream_id, version),
  UNIQUE (idempotency_key)
);


-- Projection checkpoints (high-water marks)
CREATE TABLE IF NOT EXISTS event_checkpoints (
  projection_name   TEXT PRIMARY KEY,
  last_seq          BIGINT NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  job_id         UUID PRIMARY KEY,
  kind           TEXT NOT NULL,             -- e.g., 'http_scrape', 'yara_scan'
  payload        JSONB NOT NULL,
  status         job_status NOT NULL DEFAULT 'enqueued',
  priority       int NOT NULL DEFAULT 100,  -- lower = higher prio
  attempts       int NOT NULL DEFAULT 0,
  max_attempts   int NOT NULL DEFAULT 3,
  lease_owner    TEXT,                      -- worker host pod/node id
  lease_until    TIMESTAMPTZ,               -- soft lease expiration
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at     TIMESTAMPTZ,
  finished_at    TIMESTAMPTZ,
  backoff_until  TIMESTAMPTZ,
  idempotency_key TEXT,
  UNIQUE (idempotency_key)
);

-- For structured outputs/binaries
CREATE TABLE IF NOT EXISTS artifacts (
  artifact_id   UUID PRIMARY KEY,
  job_id        UUID NOT NULL references jobs(job_id) on delete cascade,
  media_type    TEXT NOT NULL DEFAULT 'application/json',
  bytes         bytea,          -- small artifacts inline (<= 1-5MB)
  uri           TEXT,           -- large artifacts offloaded (S3/minio/local fs)
  meta          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
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
-- + every member has a DEFAULT organization created with their name
-- + this is their DEFAULT "team"
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
    uuid UUID UNIQUE DEFAULT UUID_generate_v4(),
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

-- Current entity state (document-y, Marten-style)
CREATE TABLE IF NOT EXISTS entities_current (
  entity_id   UUID PRIMARY KEY,
  label       TEXT,
  graph_id    UUID NOT NULL,
  FOREIGN KEY (graph_id) REFERENCES cases(uuid),
  doc         JSONB NOT NULL,             -- denormalized snapshot for reads
  valid_from  TIMESTAMPTZ NOT NULL,
  valid_to    TIMESTAMPTZ,                -- null => open-ended
  sys_from    TIMESTAMPTZ NOT NULL,       -- when projector wrote it
  sys_to      TIMESTAMPTZ                 -- superseded by projector
);

-- Edge materialization (graph-ish)
CREATE TABLE IF NOT EXISTS edges_current (
  edge_id     UUID PRIMARY KEY,
  src_id      UUID NOT NULL,
  dst_id      UUID NOT NULL,
  graph_id    UUID NOT NULL,
  FOREIGN KEY (graph_id) REFERENCES cases(uuid),
  -- TODO: rename kind to label in sql and ws
  kind        TEXT NOT NULL,
  props       JSONB NOT NULL DEFAULT '{}'::jsonb,
  valid_from  TIMESTAMPTZ NOT NULL,
  valid_to    TIMESTAMPTZ,
  sys_from    TIMESTAMPTZ NOT NULL,
  sys_to      TIMESTAMPTZ
);

CREATE INDEX entities_current_doc_gin_idx ON entities_current USING gin (doc jsonb_path_ops);
CREATE INDEX ON edges_current(kind, src_id, dst_id);

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
    uuid UUID DEFAULT UUID_generate_v4(),
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
    uuid UUID DEFAULT UUID_generate_v4(),
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
    uuid UUID DEFAULT UUID_generate_v4(),
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
