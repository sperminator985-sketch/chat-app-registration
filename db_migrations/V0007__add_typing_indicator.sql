ALTER TABLE t_p16512527_chat_app_registratio.users
  ADD COLUMN IF NOT EXISTS typing_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS typing_room TEXT;