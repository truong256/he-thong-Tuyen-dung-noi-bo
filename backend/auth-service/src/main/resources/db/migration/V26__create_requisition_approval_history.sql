-- V24: Tạo bảng theo dõi trạng thái và lịch sử phê duyệt yêu cầu tuyển dụng (S3-03)
-- Lưu trữ nhật ký bất biến (immutable approval history/timeline log)

CREATE TABLE IF NOT EXISTS requisition_approval_histories (
    id BIGSERIAL PRIMARY KEY,
    requisition_id BIGINT NOT NULL,
    step_order INT NOT NULL,
    step_name VARCHAR(120) NOT NULL,
    approver_id BIGINT,
    approver_name VARCHAR(150),
    approver_email VARCHAR(150),
    approver_role VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    comments TEXT,
    action_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_approval_history_requisition
        FOREIGN KEY (requisition_id)
        REFERENCES recruitment_requisitions(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_approval_history_approver
        FOREIGN KEY (approver_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_approval_history_req ON requisition_approval_histories(requisition_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_req_step ON requisition_approval_histories(requisition_id, step_order);
CREATE INDEX IF NOT EXISTS idx_approval_history_status ON requisition_approval_histories(status);
