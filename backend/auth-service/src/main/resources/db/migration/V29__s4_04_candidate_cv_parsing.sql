-- Migration V29: S4-04 CV Parsing fields and recruiter confirmation metadata
ALTER TABLE candidate_applications ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE candidate_applications ADD COLUMN IF NOT EXISTS cv_url VARCHAR(500);
ALTER TABLE candidate_applications ADD COLUMN IF NOT EXISTS cv_file_name VARCHAR(255);
ALTER TABLE candidate_applications ADD COLUMN IF NOT EXISTS parsed_full_name VARCHAR(150);
ALTER TABLE candidate_applications ADD COLUMN IF NOT EXISTS parsed_email VARCHAR(100);
ALTER TABLE candidate_applications ADD COLUMN IF NOT EXISTS parsed_phone VARCHAR(50);
ALTER TABLE candidate_applications ADD COLUMN IF NOT EXISTS parsed_status VARCHAR(50) DEFAULT 'NOT_PARSED';
ALTER TABLE candidate_applications ADD COLUMN IF NOT EXISTS parsed_message TEXT;
ALTER TABLE candidate_applications ADD COLUMN IF NOT EXISTS is_parsed_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE candidate_applications ADD COLUMN IF NOT EXISTS confirmed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE candidate_applications ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE candidate_applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE candidate_applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Make candidate_user_id nullable to allow direct CV uploads / applications from external portal candidates
ALTER TABLE candidate_applications ALTER COLUMN candidate_user_id DROP NOT NULL;
