ALTER TABLE t_p16512527_chat_app_registratio.users
  ADD COLUMN IF NOT EXISTS email VARCHAR(120),
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS email_code VARCHAR(8) NULL,
  ADD COLUMN IF NOT EXISTS email_code_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS users_email_idx ON t_p16512527_chat_app_registratio.users (lower(email));
