CREATE TABLE IF NOT EXISTS competency_frameworks (
    id BIGSERIAL PRIMARY KEY,
    competency_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    weight_percent INTEGER NOT NULL DEFAULT 100,
    job_title_id BIGINT
);

ALTER TABLE competency_frameworks
    ADD COLUMN IF NOT EXISTS job_title_id BIGINT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'job_titles'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_competency_framework_job_title'
    ) THEN
        ALTER TABLE competency_frameworks
            ADD CONSTRAINT fk_competency_framework_job_title
            FOREIGN KEY (job_title_id)
            REFERENCES job_titles(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_competency_frameworks_job_title
    ON competency_frameworks(job_title_id);

CREATE TABLE IF NOT EXISTS competency_criteria (
    id BIGSERIAL PRIMARY KEY,
    competency_framework_id BIGINT NOT NULL,
    criterion_code VARCHAR(50) NOT NULL,
    criterion_name VARCHAR(150) NOT NULL,
    description TEXT,
    weight_percent INTEGER NOT NULL DEFAULT 100,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_competency_criterion_framework
        FOREIGN KEY (competency_framework_id)
        REFERENCES competency_frameworks(id)
        ON DELETE CASCADE,
    CONSTRAINT uk_competency_criterion_code
        UNIQUE (competency_framework_id, criterion_code)
);

CREATE INDEX IF NOT EXISTS idx_competency_criteria_framework
    ON competency_criteria(competency_framework_id);

CREATE INDEX IF NOT EXISTS idx_competency_criteria_active
    ON competency_criteria(active);

CREATE TABLE IF NOT EXISTS interview_questions (
    id BIGSERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    category VARCHAR(50),
    difficulty_level VARCHAR(20),
    suggested_answer TEXT,
    competency_criterion_id BIGINT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE interview_questions
    ADD COLUMN IF NOT EXISTS competency_criterion_id BIGINT;

ALTER TABLE interview_questions
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE interview_questions
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE interview_questions
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_interview_question_criterion'
    ) THEN
        ALTER TABLE interview_questions
            ADD CONSTRAINT fk_interview_question_criterion
            FOREIGN KEY (competency_criterion_id)
            REFERENCES competency_criteria(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_interview_questions_criterion
    ON interview_questions(competency_criterion_id);

CREATE INDEX IF NOT EXISTS idx_interview_questions_difficulty
    ON interview_questions(difficulty_level);

CREATE INDEX IF NOT EXISTS idx_interview_questions_active
    ON interview_questions(active);

CREATE INDEX IF NOT EXISTS idx_interview_questions_created_at
    ON interview_questions(created_at);

CREATE INDEX IF NOT EXISTS idx_interview_questions_question_text
    ON interview_questions USING GIN (to_tsvector('simple', question_text));
