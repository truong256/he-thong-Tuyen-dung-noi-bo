-- Serialize writers in the service and enforce the invariant for direct SQL too.
-- Existing conflicting data is intentionally not deleted or reassigned: creation
-- fails safely so an operator can resolve it with its audit history intact.
CREATE UNIQUE INDEX IF NOT EXISTS uq_requisition_single_primary_recruiter
    ON requisition_assignments (requisition_id)
    WHERE role = 'RECRUITER' AND is_primary = TRUE;
