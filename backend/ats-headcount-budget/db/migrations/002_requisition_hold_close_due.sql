-- =====================================================================
-- S3-07 (SCRUM-103): tạm dừng / đóng / huỷ yêu cầu kèm lý do
-- S3-08 (SCRUM-107): hạn tuyển (due_date) để lọc & cảnh báo trễ hạn
-- Chạy sau 001:  psql -U postgres -d ats -f db/migrations/002_requisition_hold_close_due.sql
-- =====================================================================
BEGIN;

ALTER TABLE recruitment_requisitions
  ADD COLUMN IF NOT EXISTS due_date          DATE,
  ADD COLUMN IF NOT EXISTS status_reason     VARCHAR(500),
  ADD COLUMN IF NOT EXISTS status_changed_by INT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP;

ALTER TABLE recruitment_requisitions DROP CONSTRAINT IF EXISTS ck_req_status;
ALTER TABLE recruitment_requisitions ADD CONSTRAINT ck_req_status CHECK (status IN
  ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','ON_HOLD','CANCELLED','CLOSED','FILLED'));

CREATE INDEX IF NOT EXISTS ix_req_due_date ON recruitment_requisitions (due_date, status);

COMMIT;
