-- Preserve legacy departments. HR must assign a real manager before reactivation.
CREATE TABLE IF NOT EXISTS departments (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20),
    description VARCHAR(255),
    parent_department_id BIGINT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS manager_user_id BIGINT;
UPDATE departments SET active = FALSE WHERE manager_user_id IS NULL;
ALTER TABLE departments ADD CONSTRAINT fk_department_parent
    FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE RESTRICT;
ALTER TABLE departments ADD CONSTRAINT fk_department_manager
    FOREIGN KEY (manager_user_id) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE departments ADD CONSTRAINT ck_department_not_self_parent
    CHECK (parent_department_id IS NULL OR parent_department_id <> id);
ALTER TABLE departments ADD CONSTRAINT ck_active_department_manager
    CHECK (NOT active OR manager_user_id IS NOT NULL);
CREATE UNIQUE INDEX uq_department_name_normalized ON departments(LOWER(TRIM(name)));
CREATE UNIQUE INDEX uq_department_code_normalized ON departments(UPPER(TRIM(code)));
CREATE INDEX idx_department_parent ON departments(parent_department_id);
CREATE INDEX idx_department_manager ON departments(manager_user_id);
ALTER TABLE recruitment_requisitions ADD CONSTRAINT fk_requisition_department
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;
CREATE INDEX idx_requisition_department ON recruitment_requisitions(department_id);

-- Transaction-scoped mutex for hierarchy mutations, shared by all server instances.
CREATE TABLE department_tree_lock (id INTEGER PRIMARY KEY CHECK (id = 1));
INSERT INTO department_tree_lock(id) VALUES (1);
