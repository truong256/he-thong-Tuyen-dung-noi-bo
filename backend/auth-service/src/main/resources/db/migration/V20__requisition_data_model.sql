-- V20: Extend recruitment_requisitions data model for draft & formal requisition management

ALTER TABLE recruitment_requisitions
    ADD COLUMN IF NOT EXISTS recruitment_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS salary_min BIGINT,
    ADD COLUMN IF NOT EXISTS salary_max BIGINT,
    ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'VND',
    ADD COLUMN IF NOT EXISTS salary_explanation TEXT,
    ADD COLUMN IF NOT EXISTS needed_date DATE,
    ADD COLUMN IF NOT EXISTS job_description TEXT,
    ADD COLUMN IF NOT EXISTS candidate_requirements TEXT,
    ADD COLUMN IF NOT EXISTS benefits TEXT,
    ADD COLUMN IF NOT EXISTS work_location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS working_model VARCHAR(30) DEFAULT 'ONSITE',
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS approved_by_user_id BIGINT,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Synchronize needed_date with existing target_date if null
UPDATE recruitment_requisitions
SET needed_date = target_date
WHERE needed_date IS NULL AND target_date IS NOT NULL;

-- Foreign Keys (using DO block to avoid duplicate constraint errors)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_titles'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_requisition_job_title'
    ) THEN
        ALTER TABLE recruitment_requisitions
            ADD CONSTRAINT fk_requisition_job_title
            FOREIGN KEY (job_title_id)
            REFERENCES job_titles(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_requisition_created_by'
    ) THEN
        ALTER TABLE recruitment_requisitions
            ADD CONSTRAINT fk_requisition_created_by
            FOREIGN KEY (created_by_user_id)
            REFERENCES users(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_requisition_approved_by'
    ) THEN
        ALTER TABLE recruitment_requisitions
            ADD CONSTRAINT fk_requisition_approved_by
            FOREIGN KEY (approved_by_user_id)
            REFERENCES users(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_requisition_status ON recruitment_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_requisition_created_by ON recruitment_requisitions(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_requisition_job_title ON recruitment_requisitions(job_title_id);
CREATE INDEX IF NOT EXISTS idx_requisition_needed_date ON recruitment_requisitions(needed_date);
