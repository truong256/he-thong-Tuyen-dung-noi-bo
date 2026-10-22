-- Migration V21: Competency Framework and Job Title association (S2-06)
-- Multiple Job Titles can link to the same Competency Framework

ALTER TABLE job_titles
    ADD COLUMN IF NOT EXISTS competency_framework_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_job_titles_framework'
    ) THEN
        ALTER TABLE job_titles
            ADD CONSTRAINT fk_job_titles_framework
            FOREIGN KEY (competency_framework_id)
            REFERENCES competency_frameworks(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_job_titles_competency_framework
    ON job_titles(competency_framework_id);

-- If competency_frameworks previously held job_title_id, migrate it to job_titles
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'competency_frameworks' AND column_name = 'job_title_id'
    ) THEN
        UPDATE job_titles jt
        SET competency_framework_id = cf.id
        FROM competency_frameworks cf
        WHERE cf.job_title_id = jt.id AND jt.competency_framework_id IS NULL;
    END IF;
END $$;
