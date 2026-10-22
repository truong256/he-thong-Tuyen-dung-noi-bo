-- These existing entity fields were previously created only by Hibernate update in dev.
-- Add nullable columns without rewriting user data or changing earlier migration checksums.
ALTER TABLE recruitment_requisitions
    ADD COLUMN IF NOT EXISTS proposed_min_salary BIGINT,
    ADD COLUMN IF NOT EXISTS proposed_max_salary BIGINT,
    ADD COLUMN IF NOT EXISTS requirements TEXT;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username VARCHAR(255),
    ADD COLUMN IF NOT EXISTS role VARCHAR(50);
