-- Migration V29: Sprint 4 SCRUM-181 & SCRUM-182 - Candidate application withdrawal and recruiter notifications

-- 1. Extend candidate_applications with withdrawal columns
ALTER TABLE candidate_applications
    ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT;

-- 2. Create candidate_application_withdraw_tokens table for secure, single-use, time-limited withdrawal links
CREATE TABLE IF NOT EXISTS candidate_application_withdraw_tokens (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(120) NOT NULL UNIQUE,
    application_id BIGINT NOT NULL REFERENCES candidate_applications(id) ON DELETE CASCADE,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_withdraw_token_lookup ON candidate_application_withdraw_tokens(token);
CREATE INDEX IF NOT EXISTS idx_withdraw_token_app ON candidate_application_withdraw_tokens(application_id);

-- 3. Create notifications table for in-app recruiter notifications and user notification center
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'INFO',
    related_entity_id BIGINT,
    related_entity_type VARCHAR(50),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
