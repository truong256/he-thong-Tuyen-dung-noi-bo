-- S3-02: Phê duyệt yêu cầu tuyển dụng (Duyệt, Từ chối, Yêu cầu bổ sung và Ghi nhật ký bất biến)

-- 1. Nới lỏng ràng buộc check constraint trên requisition_approval_snapshots để hỗ trợ REJECTED và REQUEST_CHANGES
ALTER TABLE requisition_approval_snapshots
    DROP CONSTRAINT IF EXISTS requisition_approval_snapshots_status_check;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_requisition_approval_snapshot_status'
    ) THEN
        ALTER TABLE requisition_approval_snapshots
            ADD CONSTRAINT ck_requisition_approval_snapshot_status
            CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REQUEST_CHANGES'));
    END IF;
END $$;

-- 2. Tạo bảng nhật ký quyết định phê duyệt bất biến (Requisition Approval Logs)
CREATE TABLE IF NOT EXISTS requisition_approval_logs (
    id BIGSERIAL PRIMARY KEY,
    requisition_id BIGINT NOT NULL REFERENCES recruitment_requisitions(id) ON DELETE CASCADE,
    approver_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    step_order INTEGER,
    action VARCHAR(30) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_requisition_approval_logs_requisition
    ON requisition_approval_logs(requisition_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_requisition_approval_logs_approver
    ON requisition_approval_logs(approver_user_id);
