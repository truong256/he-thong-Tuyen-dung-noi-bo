-- V17: Add recovery_email to users for password reset delivery
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_email VARCHAR(255);
