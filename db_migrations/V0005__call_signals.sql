CREATE TABLE IF NOT EXISTS t_p16512527_chat_app_registratio.call_signals (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    call_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    payload TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    consumed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_call_signals_recipient ON t_p16512527_chat_app_registratio.call_signals (recipient_id, consumed, id);
CREATE INDEX IF NOT EXISTS idx_call_signals_call ON t_p16512527_chat_app_registratio.call_signals (call_id, id);