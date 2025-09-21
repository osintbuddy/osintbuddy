-- Attachments uploaded for entities (small files inline, larger via URI)
CREATE TABLE IF NOT EXISTS entity_attachments (
  attachment_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  graph_id        UUID NOT NULL REFERENCES cases(uuid) ON DELETE CASCADE,
  entity_id       UUID NOT NULL,
  owner_id        BIGINT NOT NULL,
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

