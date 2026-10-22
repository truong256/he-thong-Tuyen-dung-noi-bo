-- Migration V23: Add logo_url and image_url to company_profiles (S2-09)
ALTER TABLE company_profiles
    ADD COLUMN IF NOT EXISTS logo_url VARCHAR(255),
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);
