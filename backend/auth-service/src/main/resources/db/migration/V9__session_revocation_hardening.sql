-- V8: Persistent token versioning for instant access token invalidation on logout and password changes
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_users_token_version ON users(token_version);
