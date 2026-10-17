-- V30: Enhance budget override tracking for HR Manager (S3-04 / SCRUM-101)
-- Bổ sung các cột kiểm soát ngoại lệ ghi đè ngân sách và định biên headcount độc lập

ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS headcount_overridden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS budget_override_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS budget_override_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS overridden_excess_headcount INT DEFAULT 0;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS overridden_excess_salary_vnd BIGINT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_requisitions_budget_overridden ON recruitment_requisitions(budget_overridden);
CREATE INDEX IF NOT EXISTS idx_requisitions_headcount_overridden ON recruitment_requisitions(headcount_overridden);
