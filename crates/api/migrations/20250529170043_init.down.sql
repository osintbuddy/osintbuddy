-- Drop trigger created in up migration (if present)
DROP TRIGGER IF EXISTS trg_jobs_new ON jobs;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS post_tags;
DROP TABLE IF EXISTS post_edit_history;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS feeds;
DROP TABLE IF EXISTS access_logs;
DROP TABLE IF EXISTS resource_shares;
DROP TABLE IF EXISTS favorite_entities;
DROP TABLE IF EXISTS entities;
DROP TABLE IF EXISTS favorite_cases;
DROP TABLE IF EXISTS cases;
DROP TABLE IF EXISTS artifacts;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS event_checkpoints;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS edges_history;
DROP TABLE IF EXISTS entities_history;
DROP TABLE IF EXISTS edges_current; 
DROP TABLE IF EXISTS entities_current;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;
DROP TABLE IF EXISTS event_streams;
