CREATE TABLE requisition_approval_configurations (
    id BIGSERIAL PRIMARY KEY,
    department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    version INTEGER NOT NULL CHECK (version > 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (department_id, version)
);

CREATE UNIQUE INDEX uq_active_requisition_approval_configuration
    ON requisition_approval_configurations(department_id)
    WHERE active = TRUE;

CREATE TABLE requisition_approval_configuration_steps (
    id BIGSERIAL PRIMARY KEY,
    configuration_id BIGINT NOT NULL REFERENCES requisition_approval_configurations(id) ON DELETE RESTRICT,
    step_order INTEGER NOT NULL CHECK (step_order > 0),
    minimum_salary BIGINT NOT NULL CHECK (minimum_salary >= 0),
    approver_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE (configuration_id, step_order),
    UNIQUE (configuration_id, approver_user_id)
);

CREATE INDEX idx_requisition_approval_config_department
    ON requisition_approval_configurations(department_id, active, version DESC);

CREATE TABLE requisition_approval_snapshots (
    id BIGSERIAL PRIMARY KEY,
    requisition_id BIGINT NOT NULL REFERENCES recruitment_requisitions(id) ON DELETE CASCADE,
    configuration_id BIGINT NOT NULL REFERENCES requisition_approval_configurations(id) ON DELETE RESTRICT,
    configuration_version INTEGER NOT NULL,
    step_order INTEGER NOT NULL CHECK (step_order > 0),
    minimum_salary BIGINT NOT NULL CHECK (minimum_salary >= 0),
    approver_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED')),
    approved_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (requisition_id, step_order)
);

CREATE INDEX idx_requisition_approval_snapshot_pending
    ON requisition_approval_snapshots(requisition_id, status, step_order);