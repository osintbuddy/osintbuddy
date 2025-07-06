CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE organizations (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    website VARCHAR(255),
    contact_email VARCHAR(255),
    subscription_level VARCHAR(20) NOT NULL DEFAULT 'trial',
    max_users INTEGER NOT NULL DEFAULT 5,
    max_graphs INTEGER NOT NULL DEFAULT 3,
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

CREATE TABLE graphs (
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
    CONSTRAINT valid_graph_visibility CHECK (visibility IN ('private', 'organization', 'shared', 'public', 'restricted'))
);
CREATE INDEX graphs_org_id_idx ON graphs (org_id);

CREATE TABLE favorite_graphs (
    graph_id BIGSERIAL NOT NULL,
    owner_id BIGSERIAL NOT NULL,
    PRIMARY KEY (owner_id, graph_id),
    FOREIGN KEY (graph_id) REFERENCES graphs(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX favorite_graphs_owner_id_idx ON favorite_graphs (owner_id);

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
    CONSTRAINT valid_resource_type CHECK (resource_type IN ('graph', 'entity')),
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
    CONSTRAINT valid_resource_type CHECK (resource_type IN ('graph', 'entity')),
    CONSTRAINT valid_action CHECK (action IN ('create', 'read', 'update', 'delete', 'share', 'export'))
);
CREATE INDEX access_logs_user_id_idx ON access_logs (user_id);
CREATE INDEX access_logs_resource_idx ON access_logs (resource_type, resource_id);