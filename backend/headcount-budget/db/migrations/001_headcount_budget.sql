-- =====================================================================
-- SCRUM-123 [DB] Thiết kế dữ liệu ngân sách headcount theo năm
-- PostgreSQL. Tiền lương: VND, số nguyên (BIGINT).
-- Chạy:  psql -U postgres -d ats -f db/migrations/001_headcount_budget.sql
-- (Các bảng departments/users/recruitment_requisitions là bản tối thiểu;
--  khi merge với S1/S2 thì dùng bảng của các story đó.)
-- =====================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS departments (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(30)  NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  email          VARCHAR(255) NOT NULL UNIQUE,
  full_name      VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  roles          TEXT         NOT NULL,           -- 'HR_MANAGER,APPROVER'
  department_id  INT REFERENCES departments(id),
  active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMP    NOT NULL DEFAULT now()
);

-- Ngân sách headcount: 1 dòng / phòng ban / năm
CREATE TABLE IF NOT EXISTS headcount_budgets (
  id                SERIAL PRIMARY KEY,
  department_id     INT    NOT NULL REFERENCES departments(id),
  year              INT    NOT NULL,
  headcount_quota   INT    NOT NULL,
  salary_budget_vnd BIGINT NOT NULL,
  created_by        INT    NOT NULL REFERENCES users(id),
  updated_by        INT    NOT NULL REFERENCES users(id),
  version           INT    NOT NULL DEFAULT 1,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT uq_headcount_budget_dept_year UNIQUE (department_id, year),
  CONSTRAINT ck_budget_year      CHECK (year BETWEEN 2000 AND 2100),
  CONSTRAINT ck_budget_quota     CHECK (headcount_quota >= 0),
  CONSTRAINT ck_budget_salary    CHECK (salary_budget_vnd >= 0)
);

-- Yêu cầu tuyển dụng (bản tối thiểu để tính ngân sách đã dùng)
CREATE TABLE IF NOT EXISTS recruitment_requisitions (
  id                  SERIAL PRIMARY KEY,
  title               VARCHAR(255) NOT NULL,
  department_id       INT    NOT NULL REFERENCES departments(id),
  budget_year         INT    NOT NULL,
  quantity            INT    NOT NULL CHECK (quantity > 0),
  proposed_salary_vnd BIGINT NOT NULL CHECK (proposed_salary_vnd > 0),  -- VND / tháng / người
  reason              VARCHAR(20) NOT NULL DEFAULT 'NEW',                -- NEW | REPLACEMENT
  status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  created_by          INT    NOT NULL REFERENCES users(id),
  approved_by         INT    REFERENCES users(id),
  approved_at         TIMESTAMP,
  budget_overridden   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMP NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT ck_req_status CHECK (status IN
    ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','ON_HOLD','CANCELLED','FILLED'))
);
-- Index phục vụ truy vấn tính ngân sách đã dùng
CREATE INDEX IF NOT EXISTS ix_req_budget_calc
  ON recruitment_requisitions (department_id, budget_year, status);

-- Nhật ký ngân sách + ghi đè: CHỈ THÊM, không sửa/xoá
CREATE TABLE IF NOT EXISTS budget_audit_logs (
  id             SERIAL PRIMARY KEY,
  action         VARCHAR(30)  NOT NULL,
  department_id  INT          NOT NULL,
  year           INT          NOT NULL,
  requisition_id INT,
  user_id        INT          NOT NULL,
  user_email     VARCHAR(255) NOT NULL,
  reason         TEXT,
  detail         TEXT,
  created_at     TIMESTAMP    NOT NULL DEFAULT now(),
  CONSTRAINT ck_audit_action CHECK (action IN
    ('BUDGET_CREATED','BUDGET_UPDATED','BUDGET_DELETED','BUDGET_OVERRIDE')),
  -- Ghi đè bắt buộc có lý do
  CONSTRAINT ck_override_reason CHECK (action <> 'BUDGET_OVERRIDE' OR length(btrim(coalesce(reason,''))) >= 10)
);
CREATE INDEX IF NOT EXISTS ix_audit_dept_year ON budget_audit_logs (department_id, year, created_at DESC);

CREATE OR REPLACE FUNCTION fn_budget_audit_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'budget_audit_logs là nhật ký chỉ-thêm, không được sửa hoặc xoá';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_budget_audit_immutable ON budget_audit_logs;
CREATE TRIGGER trg_budget_audit_immutable
  BEFORE UPDATE OR DELETE ON budget_audit_logs
  FOR EACH ROW EXECUTE FUNCTION fn_budget_audit_immutable();

COMMIT;

-- =====================================================================
-- Truy vấn tham chiếu: headcount & ngân sách lương còn lại (SCRUM-125)
-- Chỉ tính yêu cầu đã duyệt (APPROVED) và đã tuyển đủ (FILLED).
-- Ngân sách lương dùng = quantity * lương/tháng * 12 (quy đổi cả năm).
-- =====================================================================
-- SELECT b.department_id, b.year,
--        b.headcount_quota,
--        COALESCE(SUM(r.quantity),0)                          AS headcount_used,
--        b.headcount_quota - COALESCE(SUM(r.quantity),0)      AS headcount_remaining,
--        b.salary_budget_vnd,
--        COALESCE(SUM(r.quantity * r.proposed_salary_vnd * 12),0) AS salary_used
-- FROM headcount_budgets b
-- LEFT JOIN recruitment_requisitions r
--   ON r.department_id = b.department_id AND r.budget_year = b.year
--  AND r.status IN ('APPROVED','FILLED')
-- GROUP BY b.id;
