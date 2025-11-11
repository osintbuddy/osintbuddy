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
  actor_id          UUID NOT NULL,        
  UNIQUE (stream_id, version)
);

-- Handy index when reading current version per stream
CREATE INDEX IF NOT EXISTS events_stream_id_version_idx
  ON events (stream_id, version DESC);


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
  payload        JSONB NOT NULL,
  status         job_status NOT NULL DEFAULT 'enqueued',
  priority       int NOT NULL DEFAULT 100,  -- lower = higher priority
  attempts       int NOT NULL DEFAULT 0,
  max_attempts   int NOT NULL DEFAULT 3,
  lease_owner    TEXT,                      -- worker host pod/node id
  lease_until    TIMESTAMPTZ,               -- soft lease expiration
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at     TIMESTAMPTZ,
  finished_at    TIMESTAMPTZ,
  backoff_until  TIMESTAMPTZ
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


-- Cases are the reference to a specific set entities and their relationships
CREATE TABLE IF NOT EXISTS cases (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    ctime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mtime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    org TEXT NOT NULL,
    owner_id UUID NOT NULL
);
CREATE INDEX cases_org_id_idx ON cases (org);

-- Current entity state
CREATE TABLE IF NOT EXISTS entities_current (
  PRIMARY KEY             (graph_id, entity_id),
  entity_id               UUID,
  graph_id                UUID NOT NULL,
  FOREIGN KEY             (graph_id) REFERENCES cases(uuid),
  doc                     JSONB NOT NULL,             -- denormalized snapshot for reads
  valid_from              TIMESTAMPTZ NOT NULL,
  valid_to                TIMESTAMPTZ,                -- null => open-ended
  sys_from                TIMESTAMPTZ NOT NULL,       -- when projector wrote it
  sys_to                  TIMESTAMPTZ                 -- superseded by projector
);

-- Edge materialization
CREATE TABLE IF NOT EXISTS edges_current (
  edge_id     UUID PRIMARY KEY,
  src_id      UUID NOT NULL,
  dst_id      UUID NOT NULL,
  graph_id    UUID NOT NULL,
  FOREIGN KEY (graph_id) REFERENCES cases(uuid),
  props       JSONB NOT NULL DEFAULT '{}'::jsonb,
  valid_from  TIMESTAMPTZ NOT NULL,
  valid_to    TIMESTAMPTZ,
  sys_from    TIMESTAMPTZ NOT NULL,
  sys_to      TIMESTAMPTZ
);
-- Fast path for materialized reads and deletions
CREATE INDEX IF NOT EXISTS entities_current_graph_open_idx ON entities_current (graph_id) WHERE sys_to IS NULL;
CREATE INDEX IF NOT EXISTS edges_current_graph_open_idx    ON edges_current    (graph_id) WHERE sys_to IS NULL;
CREATE INDEX IF NOT EXISTS edges_current_src_open_idx      ON edges_current    (src_id)   WHERE sys_to IS NULL;
CREATE INDEX IF NOT EXISTS edges_current_dst_open_idx      ON edges_current    (dst_id)   WHERE sys_to IS NULL;
-- Optional: property lookups
CREATE INDEX IF NOT EXISTS edges_current_props_gin_idx     ON edges_current USING gin (props jsonb_path_ops);

CREATE INDEX entities_current_doc_gin_idx ON entities_current USING gin (doc jsonb_path_ops);
CREATE INDEX IF NOT EXISTS edges_current_src_dst_open_idx ON edges_current(src_id, dst_id);

CREATE TABLE IF NOT EXISTS favorite_cases (
    case_id BIGSERIAL NOT NULL,
    owner_id UUID NOT NULL,
    PRIMARY KEY (owner_id, case_id)
);
CREATE INDEX favorite_cases_owner_id_idx ON favorite_cases (owner_id);

-- entity script source code, can be any language in theory (Python atm) as
-- long as some simple rules and data structures are followed...
CREATE TABLE IF NOT EXISTS entities (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT UUID_generate_v4() NOT NULL,
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    author TEXT NOT NULL,
    code TEXT NOT NULL,
    org TEXT NOT NULL,
    ctime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mtime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_id UUID NOT NULL
);
CREATE INDEX entities_owner_id_idx ON entities (owner_id);
CREATE INDEX entities_shared_with_org_id_idx ON entities (org);

CREATE TABLE IF NOT EXISTS favorite_entities (
    entity_id BIGSERIAL NOT NULL,
    owner_id UUID NOT NULL,
    PRIMARY KEY (owner_id, entity_id)
);
CREATE INDEX favorite_entities_owner_id_idx ON favorite_entities (owner_id);

-- Attachments uploaded for entities (small files inline, larger via URI)
CREATE TABLE IF NOT EXISTS entity_attachments (
  attachment_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  graph_id        UUID NOT NULL REFERENCES cases(uuid) ON DELETE CASCADE,
  entity_id       UUID NOT NULL,
  owner_id        UUID NOT NULL,
  filename        TEXT NOT NULL,
  media_type      TEXT NOT NULL,
  size            BIGINT NOT NULL,
  bytes           BYTEA,
  uri             TEXT,
  meta            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entity_attachments_entity_idx
  ON entity_attachments (graph_id, entity_id, created_at DESC);

