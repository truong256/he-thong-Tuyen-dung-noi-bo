-- Migration V24: Support Primary and Support Recruiters, and Track Assignment Handover History for S3-06

-- 1. Extend requisition_assignments with is_primary flag and assigned_at timestamp
ALTER TABLE requisition_assignments 
    ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_assignment_req_role_primary 
    ON requisition_assignments(requisition_id, role, is_primary);

-- 2. Create requisition_assignment_histories to track assignment transfers, handovers, and audit trail
CREATE TABLE IF NOT EXISTS requisition_assignment_histories (
    id BIGSERIAL PRIMARY KEY,
    requisition_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(50) NOT NULL,
    assignment_type VARCHAR(20) NOT NULL, -- 'PRIMARY', 'SUPPORT'
    action VARCHAR(50) NOT NULL,          -- 'ASSIGNED', 'HANDOVER', 'UNASSIGNED', 'ROLE_CHANGED'
    previous_user_id BIGINT,
    performed_by_user_id BIGINT,
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assign_hist_requisition FOREIGN KEY (requisition_id) REFERENCES recruitment_requisitions(id) ON DELETE CASCADE,
    CONSTRAINT fk_assign_hist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_assign_hist_prev_user FOREIGN KEY (previous_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_assign_hist_performer FOREIGN KEY (performed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_assign_hist_req ON requisition_assignment_histories(requisition_id);
CREATE INDEX IF NOT EXISTS idx_assign_hist_user ON requisition_assignment_histories(user_id);
CREATE INDEX IF NOT EXISTS idx_assign_hist_created ON requisition_assignment_histories(created_at);
