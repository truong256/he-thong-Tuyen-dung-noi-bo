-- V5__index_auth_token_lookups.sql
-- Optimizing token lookups and session management for Sprint 1

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_revoked ON refresh_tokens (token, revoked);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_used ON password_reset_tokens (token, used);
