CREATE TABLE IF NOT EXISTS direct_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    recipient_id INTEGER NOT NULL REFERENCES users(id),
    sender_nick VARCHAR(32) NOT NULL,
    sender_color SMALLINT NOT NULL DEFAULT 1,
    text VARCHAR(500) NOT NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_pair ON direct_messages(sender_id, recipient_id, id);
CREATE INDEX IF NOT EXISTS idx_dm_recipient ON direct_messages(recipient_id, read_at);
