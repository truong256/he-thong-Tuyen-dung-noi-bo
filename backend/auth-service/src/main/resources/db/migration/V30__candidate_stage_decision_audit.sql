-- Store recruitment decision reason and latest stage-change audit fields.
ALTER TABLE candidate_applications
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS stage_changed_by_id BIGINT,
    ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMP WITH TIME ZONE;