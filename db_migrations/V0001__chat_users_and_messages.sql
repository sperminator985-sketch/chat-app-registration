CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nick VARCHAR(32) UNIQUE NOT NULL,
    nick_lower VARCHAR(32) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    color SMALLINT NOT NULL DEFAULT 1,
    status VARCHAR(64) NOT NULL DEFAULT 'только заселился',
    room VARCHAR(32) NOT NULL DEFAULT 'kurilka',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    token VARCHAR(64) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    room VARCHAR(32) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    nick VARCHAR(32) NOT NULL,
    color SMALLINT NOT NULL DEFAULT 1,
    text VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room, id);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);
