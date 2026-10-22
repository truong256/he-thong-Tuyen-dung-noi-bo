-- Migration V22: Recruitment Categories Reference Constraints (S2-08)
-- Two-layer reference integrity between Common Categories and Recruitment data

-- 1. Add category reference columns to candidate_applications if not existing
ALTER TABLE candidate_applications
    ADD COLUMN IF NOT EXISTS candidate_source_id BIGINT,
    ADD COLUMN IF NOT EXISTS rejection_reason_id BIGINT;

-- 2. Add category reference columns to recruitment_requisitions if not existing
ALTER TABLE recruitment_requisitions
    ADD COLUMN IF NOT EXISTS work_location_id BIGINT,
    ADD COLUMN IF NOT EXISTS employment_type_id BIGINT,
    ADD COLUMN IF NOT EXISTS rejection_reason_id BIGINT;

-- 3. Add Foreign Key constraints with ON DELETE RESTRICT (Prevents deletion of referenced categories)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_candidate_app_source'
    ) THEN
        ALTER TABLE candidate_applications
            ADD CONSTRAINT fk_candidate_app_source
            FOREIGN KEY (candidate_source_id)
            REFERENCES common_categories(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_candidate_app_rejection'
    ) THEN
        ALTER TABLE candidate_applications
            ADD CONSTRAINT fk_candidate_app_rejection
            FOREIGN KEY (rejection_reason_id)
            REFERENCES common_categories(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_requisition_work_loc'
    ) THEN
        ALTER TABLE recruitment_requisitions
            ADD CONSTRAINT fk_requisition_work_loc
            FOREIGN KEY (work_location_id)
            REFERENCES common_categories(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_requisition_emp_type'
    ) THEN
        ALTER TABLE recruitment_requisitions
            ADD CONSTRAINT fk_requisition_emp_type
            FOREIGN KEY (employment_type_id)
            REFERENCES common_categories(id)
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_requisition_rejection_cat'
    ) THEN
        ALTER TABLE recruitment_requisitions
            ADD CONSTRAINT fk_requisition_rejection_cat
            FOREIGN KEY (rejection_reason_id)
            REFERENCES common_categories(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

-- 4. Create Indexes for query and join optimization
CREATE INDEX IF NOT EXISTS idx_candidate_app_source ON candidate_applications(candidate_source_id);
CREATE INDEX IF NOT EXISTS idx_candidate_app_rejection ON candidate_applications(rejection_reason_id);
CREATE INDEX IF NOT EXISTS idx_requisition_work_loc ON recruitment_requisitions(work_location_id);
CREATE INDEX IF NOT EXISTS idx_requisition_emp_type ON recruitment_requisitions(employment_type_id);
CREATE INDEX IF NOT EXISTS idx_requisition_rejection_cat ON recruitment_requisitions(rejection_reason_id);
