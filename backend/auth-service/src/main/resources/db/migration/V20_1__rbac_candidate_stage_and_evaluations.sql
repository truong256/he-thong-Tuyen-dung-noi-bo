-- Migration V20: Add stage to candidate_applications, support APPROVER in requisition_assignments, and create candidate_evaluations table

-- 1. Add stage column to candidate_applications
ALTER TABLE candidate_applications ADD COLUMN IF NOT EXISTS stage VARCHAR(50) DEFAULT 'APPLIED';

-- 2. Expand role check constraint on requisition_assignments to include APPROVER
ALTER TABLE requisition_assignments DROP CONSTRAINT IF EXISTS requisition_assignments_role_check;
ALTER TABLE requisition_assignments ADD CONSTRAINT requisition_assignments_role_check CHECK (role IN ('RECRUITER', 'HIRING_MANAGER', 'APPROVER'));

-- 3. Create persistent candidate_evaluations table for evaluation management
CREATE TABLE IF NOT EXISTS candidate_evaluations (
    id BIGSERIAL PRIMARY KEY,
    candidate_id BIGINT NOT NULL REFERENCES candidate_applications(id) ON DELETE CASCADE,
    interviewer_user_id BIGINT NOT NULL REFERENCES users(id),
    score INTEGER NOT NULL DEFAULT 5,
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evaluation_candidate ON candidate_evaluations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_interviewer ON candidate_evaluations(interviewer_user_id);
