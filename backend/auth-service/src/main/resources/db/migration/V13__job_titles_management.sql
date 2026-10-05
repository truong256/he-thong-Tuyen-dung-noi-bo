CREATE TABLE IF NOT EXISTS job_titles (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    department_id BIGINT,
    level VARCHAR(50),
    job_family VARCHAR(50),
    min_salary BIGINT,
    max_salary BIGINT,
    job_description TEXT,
    key_responsibilities TEXT,
    requirements TEXT,
    competencies TEXT,
    standard_headcount INTEGER DEFAULT 1,
    current_headcount INTEGER DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_job_titles_title UNIQUE (title),
    CONSTRAINT uk_job_titles_code UNIQUE (code),
    CONSTRAINT fk_job_titles_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_job_titles_department ON job_titles(department_id);
CREATE INDEX IF NOT EXISTS idx_job_titles_level ON job_titles(level);
CREATE INDEX IF NOT EXISTS idx_job_titles_active ON job_titles(active);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'competency_frameworks'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_competency_framework_job_title'
    ) THEN
        ALTER TABLE competency_frameworks
            ADD CONSTRAINT fk_competency_framework_job_title
            FOREIGN KEY (job_title_id)
            REFERENCES job_titles(id)
            ON DELETE SET NULL;
    END IF;
END $$;
