-- Migration V29: Internal Candidate Referrals (S4-07 / SCRUM-184)
-- Hỗ trợ nhân viên nội bộ giới thiệu ứng viên cho các vị trí đang tuyển
-- Tự động gắn nhãn nguồn "INTERNAL_REFERRAL", lưu danh tính người giới thiệu và theo dõi trạng thái tổng quát

CREATE TABLE IF NOT EXISTS candidate_referrals (
    id BIGSERIAL PRIMARY KEY,
    candidate_application_id BIGINT,
    job_posting_id BIGINT REFERENCES job_postings(id) ON DELETE SET NULL,
    requisition_id BIGINT REFERENCES recruitment_requisitions(id) ON DELETE CASCADE,
    candidate_name VARCHAR(150) NOT NULL,
    candidate_email VARCHAR(100) NOT NULL,
    candidate_phone VARCHAR(50),
    cv_url VARCHAR(500),
    relationship VARCHAR(100),
    referral_notes TEXT NOT NULL,
    referrer_user_id BIGINT NOT NULL REFERENCES users(id),
    referrer_name VARCHAR(150) NOT NULL,
    referrer_email VARCHAR(100),
    source VARCHAR(50) NOT NULL DEFAULT 'INTERNAL_REFERRAL',
    general_status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referral_referrer ON candidate_referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_candidate_email ON candidate_referrals(candidate_email);
CREATE INDEX IF NOT EXISTS idx_referral_job_posting ON candidate_referrals(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_referral_requisition ON candidate_referrals(requisition_id);
CREATE INDEX IF NOT EXISTS idx_referral_status ON candidate_referrals(general_status);

-- Bổ sung các cột thông tin người giới thiệu và nguồn vào candidate_applications
ALTER TABLE candidate_applications
    ADD COLUMN IF NOT EXISTS referrer_user_id BIGINT,
    ADD COLUMN IF NOT EXISTS referrer_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS referral_notes TEXT,
    ADD COLUMN IF NOT EXISTS candidate_source_code VARCHAR(50) DEFAULT 'INTERNAL_REFERRAL',
    ADD COLUMN IF NOT EXISTS job_posting_id BIGINT,
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS cv_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS relationship VARCHAR(100),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Nới lỏng NOT NULL cho candidate_user_id để hỗ trợ trường hợp ứng viên chưa có tài khoản hệ thống
ALTER TABLE candidate_applications ALTER COLUMN candidate_user_id DROP NOT NULL;
