CREATE SCHEMA IF NOT EXISTS game_private;
REVOKE ALL ON SCHEMA game_private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS game_private.sessions (
  id uuid PRIMARY KEY, token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON game_private.sessions(expires_at);
CREATE TABLE IF NOT EXISTS game_private.rooms (
  code char(6) PRIMARY KEY, snapshot jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS game_private.command_receipts (
  session_id uuid NOT NULL REFERENCES game_private.sessions(id) ON DELETE CASCADE,
  command_id uuid NOT NULL, payload_hash text NOT NULL, response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(session_id,command_id)
);
REVOKE ALL ON ALL TABLES IN SCHEMA game_private FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA game_private REVOKE ALL ON TABLES FROM PUBLIC;
