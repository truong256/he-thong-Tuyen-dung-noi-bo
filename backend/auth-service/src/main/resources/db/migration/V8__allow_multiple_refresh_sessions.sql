-- The former @OneToOne mapping let Hibernate add a UNIQUE(user_id) constraint.
-- Revoked sessions must not prevent logging in after a password reset.
-- Remove only that single-column constraint; retain token uniqueness and the FK.
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND c.conkey = ARRAY[a.attnum]
        WHERE c.conrelid = 'refresh_tokens'::regclass
          AND c.contype = 'u'
          AND a.attname = 'user_id'
    LOOP
        EXECUTE format('ALTER TABLE refresh_tokens DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END $$;
