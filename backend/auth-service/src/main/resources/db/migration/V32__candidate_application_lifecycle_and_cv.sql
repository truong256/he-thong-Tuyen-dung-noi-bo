-- Migration V32: Consolidate candidate application lifecycle fields and CV metadata
ALTER TABLE candidate_applications
    ADD COLUMN IF NOT EXISTS phone VARCHAR(25),
    ADD COLUMN IF NOT EXISTS cover_letter TEXT,
    ADD COLUMN IF NOT EXISTS cv_file_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS cv_file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stored_file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS job_posting_id BIGINT,
    ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS stage_changed_by_id BIGINT,
    ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT;
