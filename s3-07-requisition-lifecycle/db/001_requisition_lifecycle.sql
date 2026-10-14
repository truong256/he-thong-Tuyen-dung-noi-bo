-- S3-07: Tạm dừng / Đóng / Huỷ yêu cầu tuyển dụng (PostgreSQL)
-- Giả định đã có bảng requisitions (S2-10) và job_postings (S3-09/S4-08).
BEGIN;

ALTER TABLE requisitions
  ADD COLUMN IF NOT EXISTS status_reason_code varchar(50),
  ADD COLUMN IF NOT EXISTS status_note        varchar(500),
  ADD COLUMN IF NOT EXISTS status_changed_by  uuid,
  ADD COLUMN IF NOT EXISTS status_changed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS version            integer NOT NULL DEFAULT 1;

ALTER TABLE requisitions DROP CONSTRAINT IF EXISTS chk_requisitions_status;
ALTER TABLE requisitions ADD CONSTRAINT chk_requisitions_status CHECK (
  status IN ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','PAUSED','FILLED','CANCELLED')
);

-- Tạm dừng / Đã tuyển đủ / Huỷ bắt buộc có lý do (AC1)
ALTER TABLE requisitions DROP CONSTRAINT IF EXISTS chk_requisitions_reason;
ALTER TABLE requisitions ADD CONSTRAINT chk_requisitions_reason CHECK (
  status NOT IN ('PAUSED','FILLED','CANCELLED') OR status_reason_code IS NOT NULL
);

-- Nhật ký chuyển trạng thái: người thao tác + thời điểm (AC4)
CREATE TABLE IF NOT EXISTS requisition_status_history (
  id                      bigserial PRIMARY KEY,
  requisition_id          uuid         NOT NULL REFERENCES requisitions(id),
  from_status             varchar(30)  NOT NULL,
  to_status               varchar(30)  NOT NULL,
  reason_code             varchar(50),
  note                    varchar(500),
  actor_id                uuid         NOT NULL,
  actor_role              varchar(30)  NOT NULL,
  occurred_at             timestamptz  NOT NULL DEFAULT now(),
  unpublished_posting_ids uuid[]       NOT NULL DEFAULT '{}',
  pipeline_acknowledged   integer      NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rsh_requisition ON requisition_status_history (requisition_id, occurred_at);

-- Append-only: cấm sửa/xoá lịch sử
CREATE OR REPLACE FUNCTION trg_rsh_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'requisition_status_history là bảng chỉ ghi thêm' USING ERRCODE = '23514';
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rsh_no_update_delete ON requisition_status_history;
CREATE TRIGGER rsh_no_update_delete
  BEFORE UPDATE OR DELETE ON requisition_status_history
  FOR EACH ROW EXECUTE FUNCTION trg_rsh_append_only();

-- Nhất quán tin <-> yêu cầu (Technical Note 2): chỉ đăng tin khi yêu cầu đang APPROVED
CREATE OR REPLACE FUNCTION trg_posting_requires_approved() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'PUBLISHED' AND NOT EXISTS (
    SELECT 1 FROM requisitions r WHERE r.id = NEW.requisition_id AND r.status = 'APPROVED'
  ) THEN
    RAISE EXCEPTION 'Chỉ đăng tin khi yêu cầu ở trạng thái APPROVED' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posting_requires_approved ON job_postings;
CREATE TRIGGER posting_requires_approved
  BEFORE INSERT OR UPDATE OF status ON job_postings
  FOR EACH ROW EXECUTE FUNCTION trg_posting_requires_approved();

-- Tăng tốc truy vấn gỡ tin và job đối soát
CREATE INDEX IF NOT EXISTS idx_postings_published_by_req ON job_postings (requisition_id) WHERE status = 'PUBLISHED';

COMMIT;
