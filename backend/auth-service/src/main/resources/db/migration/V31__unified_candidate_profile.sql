-- Migration V31: S4-09 Unified Candidate Profile, Notes, Tags, and CV Attachment History

-- 1. Extend candidate_applications with contact info, cover letter, CV metadata and application timestamp
ALTER TABLE candidate_applications
    ADD COLUMN IF NOT EXISTS phone VARCHAR(25),
    ADD COLUMN IF NOT EXISTS cv_file_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS cv_file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS cv_file_size BIGINT,
    ADD COLUMN IF NOT EXISTS cv_content_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cover_letter TEXT,
    ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

UPDATE candidate_applications
SET applied_at = CURRENT_TIMESTAMP
WHERE applied_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_candidate_apps_user ON candidate_applications(candidate_user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_apps_email ON candidate_applications(email);
CREATE INDEX IF NOT EXISTS idx_candidate_apps_req ON candidate_applications(requisition_id);

-- 2. Create candidate_notes table for internal evaluation and recruiter notes
CREATE TABLE IF NOT EXISTS candidate_notes (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES candidate_applications(id) ON DELETE CASCADE,
    candidate_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name VARCHAR(150),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_candidate_notes_app ON candidate_notes(application_id);
CREATE INDEX IF NOT EXISTS idx_candidate_notes_user ON candidate_notes(candidate_user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_notes_created ON candidate_notes(created_at DESC);

-- 3. Create candidate_tags table for recruiter skill and category tagging
CREATE TABLE IF NOT EXISTS candidate_tags (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES candidate_applications(id) ON DELETE CASCADE,
    candidate_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    tag_name VARCHAR(100) NOT NULL,
    created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_candidate_app_tag UNIQUE (application_id, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_candidate_tags_app ON candidate_tags(application_id);
CREATE INDEX IF NOT EXISTS idx_candidate_tags_user ON candidate_tags(candidate_user_id);
