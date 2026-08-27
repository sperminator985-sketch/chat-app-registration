ALTER TABLE t_p16512527_chat_app_registratio.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS ban_reason VARCHAR(200) NULL;

ALTER TABLE t_p16512527_chat_app_registratio.messages
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_messages_visible
  ON t_p16512527_chat_app_registratio.messages (room, id)
  WHERE hidden_at IS NULL;