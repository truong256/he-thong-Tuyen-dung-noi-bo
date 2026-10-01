-- These Sprint 2 tables were previously created only by Hibernate ddl-auto=update.
CREATE TABLE IF NOT EXISTS recruitment_requisitions (
    id BIGSERIAL PRIMARY KEY,
    requisition_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    department_id BIGINT,
    job_title_id BIGINT,
    quantity INTEGER NOT NULL DEFAULT 1,
    target_date DATE,
    status VARCHAR(30) DEFAULT 'DRAFT',
    reason TEXT,
    created_by_user_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS salary_ranges (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    min_salary NUMERIC(38, 2) NOT NULL,
    max_salary NUMERIC(38, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'VND',
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE requisition_assignments (
    id BIGSERIAL PRIMARY KEY,
    requisition_id BIGINT NOT NULL REFERENCES recruitment_requisitions(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('RECRUITER', 'HIRING_MANAGER')),
    UNIQUE (requisition_id, user_id)
);
CREATE INDEX idx_assignment_user_role ON requisition_assignments(user_id, role, requisition_id);

CREATE TABLE candidate_applications (
    id BIGSERIAL PRIMARY KEY,
    requisition_id BIGINT NOT NULL REFERENCES recruitment_requisitions(id) ON DELETE CASCADE,
    candidate_user_id BIGINT NOT NULL REFERENCES users(id),
    interviewer_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(100) NOT NULL
);
CREATE INDEX idx_application_requisition ON candidate_applications(requisition_id);
CREATE INDEX idx_application_candidate ON candidate_applications(candidate_user_id);
CREATE INDEX idx_application_interviewer ON candidate_applications(interviewer_user_id);
