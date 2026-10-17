-- V29: Headcount budget and audit logs (S3-04 / SCRUM-101 / SCRUM-123 / SCRUM-124 / SCRUM-125)
CREATE TABLE IF NOT EXISTS headcount_budgets (
    id                BIGSERIAL PRIMARY KEY,
    department_id     BIGINT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    year              INT NOT NULL,
    headcount_quota   INT NOT NULL,
    salary_budget_vnd BIGINT NOT NULL,
    note              VARCHAR(500),
    created_by        BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by        BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    version           INT NOT NULL DEFAULT 1,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_headcount_budget_dept_year UNIQUE (department_id, year),
    CONSTRAINT ck_budget_year CHECK (year BETWEEN 2000 AND 2100),
    CONSTRAINT ck_budget_quota CHECK (headcount_quota >= 0),
    CONSTRAINT ck_budget_salary CHECK (salary_budget_vnd >= 0)
);

CREATE INDEX IF NOT EXISTS idx_headcount_budgets_dept_year ON headcount_budgets(department_id, year);

CREATE TABLE IF NOT EXISTS budget_audit_logs (
    id             BIGSERIAL PRIMARY KEY,
    action         VARCHAR(30) NOT NULL,
    department_id  BIGINT NOT NULL,
    year           INT NOT NULL,
    requisition_id BIGINT REFERENCES recruitment_requisitions(id) ON DELETE SET NULL,
    user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    user_email     VARCHAR(255) NOT NULL,
    user_full_name VARCHAR(255),
    reason         TEXT,
    detail         TEXT,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_budget_audit_dept_year ON budget_audit_logs(department_id, year, created_at DESC);

ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS budget_overridden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS budget_override_reason TEXT;
