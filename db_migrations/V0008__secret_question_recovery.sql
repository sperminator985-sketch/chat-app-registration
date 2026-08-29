ALTER TABLE t_p16512527_chat_app_registratio.users
  ADD COLUMN IF NOT EXISTS secret_question TEXT,
  ADD COLUMN IF NOT EXISTS secret_answer_hash TEXT;