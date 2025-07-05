CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    password VARCHAR(100) NOT NULL,
    ctime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mtime TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX users_email_idx ON users (email);

CREATE TABLE graphs (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    ctime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mtime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_id BIGSERIAL NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX graphs_label_idx ON graphs (label);
CREATE INDEX graphs_description_idx ON graphs (description);

CREATE TABLE favorite_graphs (
    PRIMARY KEY (owner_id, graph_id),
    graph_id BIGSERIAL NOT NULL,
    owner_id BIGSERIAL NOT NULL,
    FOREIGN KEY (graph_id) REFERENCES graphs(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX favorite_graphs_owner_id_idx ON graphs (owner_id);

CREATE TABLE entities (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    author TEXT NOT NULL,
    source TEXT NOT NULL,
    ctime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mtime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_id BIGSERIAL NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX entities_label_idx ON entities (label);
CREATE INDEX entities_description_idx ON entities (description);
CREATE INDEX entities_owner_id_idx ON entities (owner_id);

CREATE TABLE favorite_entities (
    PRIMARY KEY (owner_id, entity_id),
    entity_id BIGSERIAL NOT NULL,
    owner_id BIGSERIAL NOT NULL,
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX favorite_entities_owner_id_idx ON graphs (owner_id);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE user_roles (
    user_id BIGSERIAL NOT NULL,
    role_id UUID NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);
CREATE INDEX user_roles_user_id_idx ON user_roles (user_id);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);