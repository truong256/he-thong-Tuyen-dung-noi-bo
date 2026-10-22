-- V31: Add phone, cover letter, job posting reference, and CV storage metadata to candidate_applications
ALTER TABLE candidate_applications
    ADD COLUMN IF NOT EXISTS phone VARCHAR(25),
    ADD COLUMN IF NOT EXISTS cover_letter TEXT,
    ADD COLUMN IF NOT EXISTS cv_file_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS cv_file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stored_file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS job_posting_id BIGINT,
    ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITH TIME ZONE;
