-- S2-10: Recruitment Requisition Data Model (SCRUM-92, SCRUM-93, SCRUM-94)
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS recruitment_type VARCHAR(30);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS salary_min BIGINT;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS salary_max BIGINT;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS salary_explanation TEXT;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS job_description TEXT;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS candidate_requirements TEXT;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_requisition_recruitment_type') THEN
        ALTER TABLE recruitment_requisitions
            ADD CONSTRAINT ck_requisition_recruitment_type
            CHECK (recruitment_type IS NULL OR recruitment_type IN ('REPLACEMENT', 'NEW'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_requisition_salary_valid') THEN
        ALTER TABLE recruitment_requisitions
            ADD CONSTRAINT ck_requisition_salary_valid
            CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_requisition_quantity_positive') THEN
        ALTER TABLE recruitment_requisitions
            ADD CONSTRAINT ck_requisition_quantity_positive
            CHECK (quantity > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_requisition_job_title') THEN
        ALTER TABLE recruitment_requisitions
            ADD CONSTRAINT fk_requisition_job_title
            FOREIGN KEY (job_title_id) REFERENCES job_titles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_requisition_created_by') THEN
        ALTER TABLE recruitment_requisitions
            ADD CONSTRAINT fk_requisition_created_by
            FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_requisition_job_title ON recruitment_requisitions(job_title_id);
CREATE INDEX IF NOT EXISTS idx_requisition_created_by ON recruitment_requisitions(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_requisition_status ON recruitment_requisitions(status);