CREATE TABLE IF NOT EXISTS common_categories (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uk_common_categories_type_code UNIQUE (type, code)
);

CREATE INDEX IF NOT EXISTS idx_common_categories_type ON common_categories(type);
CREATE INDEX IF NOT EXISTS idx_common_categories_active ON common_categories(active);
