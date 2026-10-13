-- S3-10: Duyệt và xuất bản tin tuyển dụng (SCRUM-105 / SCRUM-149 / SCRUM-150 / SCRUM-151)
-- 1. Tạo bảng job_postings (Tin tuyển dụng)
CREATE TABLE IF NOT EXISTS job_postings (
    id BIGSERIAL PRIMARY KEY,
    requisition_id BIGINT REFERENCES recruitment_requisitions(id) ON DELETE SET NULL,
    job_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
    job_title_id BIGINT REFERENCES job_titles(id) ON DELETE SET NULL,
    work_location VARCHAR(255),
    work_location_id BIGINT,
    employment_type_id BIGINT,
    working_model VARCHAR(50) DEFAULT 'ONSITE', -- ONSITE, HYBRID, REMOTE
    quantity INTEGER DEFAULT 1,
    job_description TEXT,
    requirements TEXT,
    benefits TEXT,
    salary_min BIGINT,
    salary_max BIGINT,
    currency VARCHAR(10) DEFAULT 'VND',
    is_salary_visible BOOLEAN DEFAULT TRUE,
    application_deadline DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING_APPROVAL, APPROVED, PUBLISHED, UNPUBLISHED, REJECTED, CLOSED
    approved_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    published_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    unpublished_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    unpublished_at TIMESTAMP WITH TIME ZONE,
    unpublish_reason TEXT,
    created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_postings_status_deadline
    ON job_postings (status, application_deadline);

CREATE INDEX IF NOT EXISTS idx_job_postings_department
    ON job_postings (department_id);

CREATE INDEX IF NOT EXISTS idx_job_postings_requisition
    ON job_postings (requisition_id);

CREATE INDEX IF NOT EXISTS idx_job_postings_created_at
    ON job_postings (created_at DESC);

-- 2. Tạo bảng job_posting_audit_logs (Nhật ký duyệt, xuất bản và gỡ tin bất biến)
CREATE TABLE IF NOT EXISTS job_posting_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    job_posting_id BIGINT NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(50) NOT NULL, -- CREATE, SUBMIT_APPROVAL, APPROVE, PUBLISH, APPROVE_AND_PUBLISH, UNPUBLISH, REJECT, UPDATE
    from_status VARCHAR(30),
    to_status VARCHAR(30),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_posting_audit_logs_job
    ON job_posting_audit_logs (job_posting_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_posting_audit_logs_user
    ON job_posting_audit_logs (user_id);
