-- Drop trigger and its function created in up migration (if present)
DROP TRIGGER IF EXISTS trg_jobs_new ON jobs;
DROP FUNCTION IF EXISTS notify_jobs_new();

-- Drop tables in reverse dependency order (children before parents)
DROP TABLE IF EXISTS favorite_entities;
DROP TABLE IF EXISTS entities;
DROP TABLE IF EXISTS favorite_cases;
DROP TABLE IF EXISTS entities_current;
DROP TABLE IF EXISTS edges_current;

-- Attachments depend on cases; drop index then table
DROP INDEX IF EXISTS entity_attachments_entity_idx;
DROP TABLE IF EXISTS entity_attachments;

-- Event sourcing: events depends on users and event_streams
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS event_checkpoints;
DROP TABLE IF EXISTS event_streams;

-- Jobs: artifacts depends on jobs
DROP TABLE IF EXISTS artifacts;
DROP TABLE IF EXISTS jobs;

-- Cases reference users and organizations
DROP TABLE IF EXISTS cases;

-- Drop enum types created in up
DROP TYPE IF EXISTS job_status;
