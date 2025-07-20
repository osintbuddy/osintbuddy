CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE organizations (
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

CREATE TABLE users (
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
      'standard', 'owner', 'moderator', 'superadmin'
    ))
);
CREATE INDEX users_email_idx ON users (email);
CREATE INDEX users_org_id_idx ON users (org_id);

CREATE TABLE cases (
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

CREATE TABLE favorite_cases (
    case_id BIGSERIAL NOT NULL,
    owner_id BIGSERIAL NOT NULL,
    PRIMARY KEY (owner_id, case_id),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX favorite_cases_owner_id_idx ON favorite_cases (owner_id);

CREATE TABLE entities (
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

CREATE TABLE favorite_entities (
    entity_id BIGSERIAL NOT NULL,
    owner_id BIGSERIAL NOT NULL,
    PRIMARY KEY (owner_id, entity_id),
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX favorite_entities_owner_id_idx ON favorite_entities (owner_id);

CREATE TABLE resource_shares (
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
  
CREATE TABLE access_logs (
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

CREATE TABLE feeds (
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

CREATE TABLE posts (
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

CREATE TABLE post_edit_history (
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

CREATE TABLE tags (
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

CREATE TABLE post_tags (
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