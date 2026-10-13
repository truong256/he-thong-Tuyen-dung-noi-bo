-- V28: Tạo bảng job_postings quản lý tin tuyển dụng soạn từ yêu cầu tuyển dụng đã duyệt (S3-09)

CREATE TABLE IF NOT EXISTS job_postings (
    id BIGSERIAL PRIMARY KEY,
    posting_code VARCHAR(50) NOT NULL UNIQUE,
    requisition_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    job_description TEXT NOT NULL,
    candidate_requirements TEXT NOT NULL,
    benefits TEXT,
    work_location VARCHAR(255) NOT NULL,
    work_location_id BIGINT,
    working_model VARCHAR(30) NOT NULL DEFAULT 'ONSITE',
    application_deadline DATE NOT NULL,
    show_salary BOOLEAN NOT NULL DEFAULT TRUE,
    salary_type VARCHAR(30) NOT NULL DEFAULT 'RANGE',
    salary_min BIGINT,
    salary_max BIGINT,
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    created_by_user_id BIGINT NOT NULL,
    updated_by_user_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_job_postings_requisition 
        FOREIGN KEY (requisition_id) 
        REFERENCES recruitment_requisitions(id) 
        ON DELETE RESTRICT,

    CONSTRAINT fk_job_postings_created_by 
        FOREIGN KEY (created_by_user_id) 
        REFERENCES users(id) 
        ON DELETE RESTRICT,

    CONSTRAINT fk_job_postings_updated_by 
        FOREIGN KEY (updated_by_user_id) 
        REFERENCES users(id) 
        ON DELETE SET NULL,

    CONSTRAINT ck_job_postings_status 
        CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'CLOSED')),

    CONSTRAINT ck_job_postings_working_model 
        CHECK (working_model IN ('ONSITE', 'HYBRID', 'REMOTE')),

    CONSTRAINT ck_job_postings_salary_type 
        CHECK (salary_type IN ('RANGE', 'EXACT', 'NEGOTIABLE'))
);

-- Chỉ mục tối ưu tìm kiếm và truy vấn
CREATE INDEX IF NOT EXISTS idx_job_postings_requisition ON job_postings(requisition_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_deadline ON job_postings(application_deadline);
CREATE INDEX IF NOT EXISTS idx_job_postings_created_at ON job_postings(created_at DESC);
