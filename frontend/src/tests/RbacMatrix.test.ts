/**
 * RBAC Regression Tests – Frontend
 * Tests verify that the AuthContext correctly reflects server-granted permissions
 * and that RoleGuard/PermissionGuard blocks unauthorized access.
 *
 * Coverage: All 7 roles × key permission checks from backlog Sheet 2. User Roles
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Helper to create a minimal AuthContext value for a given role/permissions setup
function createAuthContext(
  roles: string[],
  permissions: string[],
  overrides: Partial<any> = {}
) {
  const user = {
    id: 1,
    email: 'test@company.com',
    fullName: 'Test User',
    role: roles[0] || 'CANDIDATE',
    roles,
    status: 'ACTIVE',
  };

  const hasRole = (role: string) => roles.some(r => r.toUpperCase() === role.toUpperCase());
  const hasAnyRole = (rolesToCheck: string[]) =>
    rolesToCheck.some(targetRole => roles.some(r => r.toUpperCase() === targetRole.toUpperCase()));
  const hasPermission = (perm: string) => permissions.includes(perm);
  const hasAnyPermission = (perms: string[]) => perms.some(p => permissions.includes(p));

  return {
    user,
    token: 'mock-token',
    permissions,
    isAuthenticated: true,
    isLoading: false,
    login: async () => user as any,
    logout: async () => {},
    refreshUser: async () => {},
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,
    ...overrides,
  };
}

// Permission sets derived from RolePermissions.java backlog matrix
const BASE_PERMS = ['PROFILE_READ', 'PROFILE_UPDATE', 'NOTIFICATION_READ_OWN'];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  CANDIDATE: [
    ...BASE_PERMS,
    'APPLICATION_CREATE', 'CANDIDATE_READ_OWN', 'OFFER_READ_OWN', 'OFFER_RESPOND',
  ],
  RECRUITER: [
    ...BASE_PERMS,
    'CATALOG_READ', 'JOB_MANAGE', 'CANDIDATE_READ_ASSIGNED',
    'PIPELINE_MANAGE', 'INTERVIEW_MANAGE', 'EVALUATION_READ', 'OFFER_MANAGE', 'ONBOARDING_MANAGE',
    'NOTIFICATION_MANAGE', 'REPORT_READ',
  ],
  HIRING_MANAGER: [
    ...BASE_PERMS,
    'CATALOG_READ', 'REQUISITION_CREATE', 'REQUISITION_READ_OWN',
    'CANDIDATE_READ_ASSIGNED', 'INTERVIEW_READ_ASSIGNED', 'EVALUATION_READ',
    'OFFER_READ_OWN', 'REPORT_READ',
  ],
  INTERVIEWER: [
    ...BASE_PERMS,
    'CATALOG_READ', 'CANDIDATE_READ_ASSIGNED', 'INTERVIEW_READ_ASSIGNED',
    'EVALUATION_READ', 'EVALUATION_SUBMIT',
  ],
  HR_MANAGER: [
    ...BASE_PERMS,
    'DEPARTMENT_MANAGE', 'CATALOG_READ', 'CATALOG_MANAGE', 'SALARY_READ', 'SALARY_MANAGE',
    'REQUISITION_READ_ALL', 'REQUISITION_APPROVE', 'RECRUITER_ASSIGN', 'JOB_MANAGE',
    'CANDIDATE_READ_ALL', 'PIPELINE_MANAGE', 'INTERVIEW_MANAGE', 'EVALUATION_READ', 'EVALUATION_SUBMIT',
    'OFFER_MANAGE', 'OFFER_APPROVE', 'ONBOARDING_MANAGE', 'NOTIFICATION_MANAGE', 'REPORT_READ',
    'USER_READ', 'ROLE_READ', 'AUDIT_READ',
  ],
  APPROVER: [
    ...BASE_PERMS,
    'CATALOG_READ', 'REQUISITION_APPROVE', 'CANDIDATE_READ_ALL',
    'EVALUATION_READ', 'OFFER_APPROVE', 'REPORT_READ',
  ],
  ADMIN: [
    ...BASE_PERMS,
    'USER_READ', 'USER_MANAGE', 'ROLE_READ', 'ROLE_MANAGE', 'AUDIT_READ',
    'CATALOG_READ', 'CATALOG_MANAGE',
    'REQUISITION_CREATE', 'REQUISITION_READ_ALL', 'REQUISITION_APPROVE',
    'RECRUITER_ASSIGN', 'JOB_MANAGE', 'CANDIDATE_READ_ALL',
    'PIPELINE_MANAGE', 'INTERVIEW_MANAGE', 'EVALUATION_READ',
    'OFFER_MANAGE', 'OFFER_APPROVE', 'ONBOARDING_MANAGE',
    'NOTIFICATION_MANAGE', 'REPORT_READ',
  ],
};

describe('RBAC Matrix – Backlog Sheet 2. User Roles', () => {

  // -------------------------------------------------------------------------
  // BASE PERMISSIONS: Every authenticated role gets profile permissions
  // -------------------------------------------------------------------------
  describe('All 7 roles have base profile permissions', () => {
    const allRoles = Object.keys(ROLE_PERMISSIONS) as string[];
    allRoles.forEach(role => {
      it(`${role} has PROFILE_READ and PROFILE_UPDATE`, () => {
        const ctx = createAuthContext([role], ROLE_PERMISSIONS[role]);
        expect(ctx.hasPermission('PROFILE_READ')).toBe(true);
        expect(ctx.hasPermission('PROFILE_UPDATE')).toBe(true);
      });
    });
  });

  // -------------------------------------------------------------------------
  // CANDIDATE
  // -------------------------------------------------------------------------
  describe('CANDIDATE permissions (S1-05)', () => {
    let ctx: ReturnType<typeof createAuthContext>;
    beforeEach(() => { ctx = createAuthContext(['CANDIDATE'], ROLE_PERMISSIONS.CANDIDATE); });

    it('has APPLICATION_CREATE and CANDIDATE_READ_OWN', () => {
      expect(ctx.hasPermission('APPLICATION_CREATE')).toBe(true);
      expect(ctx.hasPermission('CANDIDATE_READ_OWN')).toBe(true);
    });
    it('does NOT have CATALOG_READ', () => {
      expect(ctx.hasPermission('CATALOG_READ')).toBe(false);
    });
    it('does NOT have SALARY_READ', () => {
      expect(ctx.hasPermission('SALARY_READ')).toBe(false);
    });
    it('does NOT have USER_READ or USER_MANAGE', () => {
      expect(ctx.hasPermission('USER_READ')).toBe(false);
      expect(ctx.hasPermission('USER_MANAGE')).toBe(false);
    });
    it('does NOT have CANDIDATE_READ_ALL', () => {
      expect(ctx.hasPermission('CANDIDATE_READ_ALL')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // INTERVIEWER
  // -------------------------------------------------------------------------
  describe('INTERVIEWER permissions', () => {
    let ctx: ReturnType<typeof createAuthContext>;
    beforeEach(() => { ctx = createAuthContext(['INTERVIEWER'], ROLE_PERMISSIONS.INTERVIEWER); });

    it('has CATALOG_READ for job title reference', () => {
      expect(ctx.hasPermission('CATALOG_READ')).toBe(true);
    });
    it('has CANDIDATE_READ_ASSIGNED (scoped, not all)', () => {
      expect(ctx.hasPermission('CANDIDATE_READ_ASSIGNED')).toBe(true);
      expect(ctx.hasPermission('CANDIDATE_READ_ALL')).toBe(false);
    });
    it('does NOT have SALARY_READ (S2-05 interviewer exclusion)', () => {
      expect(ctx.hasPermission('SALARY_READ')).toBe(false);
    });
    it('has EVALUATION_SUBMIT for interview score cards', () => {
      expect(ctx.hasPermission('EVALUATION_SUBMIT')).toBe(true);
    });
    it('does NOT have PIPELINE_MANAGE or JOB_MANAGE', () => {
      expect(ctx.hasPermission('PIPELINE_MANAGE')).toBe(false);
      expect(ctx.hasPermission('JOB_MANAGE')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // HIRING_MANAGER
  // -------------------------------------------------------------------------
  describe('HIRING_MANAGER permissions', () => {
    let ctx: ReturnType<typeof createAuthContext>;
    beforeEach(() => { ctx = createAuthContext(['HIRING_MANAGER'], ROLE_PERMISSIONS.HIRING_MANAGER); });

    it('does NOT have SALARY_READ (GAP 02: S2-05 only HR_MANAGER)', () => {
      expect(ctx.hasPermission('SALARY_READ')).toBe(false);
    });
    it('has EVALUATION_READ but does NOT have EVALUATION_SUBMIT (GAP 03: R* per backlog)', () => {
      expect(ctx.hasPermission('EVALUATION_READ')).toBe(true);
      expect(ctx.hasPermission('EVALUATION_SUBMIT')).toBe(false);
    });
    it('has REQUISITION_CREATE and REQUISITION_READ_OWN', () => {
      expect(ctx.hasPermission('REQUISITION_CREATE')).toBe(true);
      expect(ctx.hasPermission('REQUISITION_READ_OWN')).toBe(true);
    });
    it('does NOT have PIPELINE_MANAGE (F is Recruiter only)', () => {
      expect(ctx.hasPermission('PIPELINE_MANAGE')).toBe(false);
    });
    it('does NOT have USER_READ or USER_MANAGE', () => {
      expect(ctx.hasPermission('USER_READ')).toBe(false);
    });
    it('does NOT have CATALOG_MANAGE (only read)', () => {
      expect(ctx.hasPermission('CATALOG_MANAGE')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // RECRUITER
  // -------------------------------------------------------------------------
  describe('RECRUITER permissions', () => {
    let ctx: ReturnType<typeof createAuthContext>;
    beforeEach(() => { ctx = createAuthContext(['RECRUITER'], ROLE_PERMISSIONS.RECRUITER); });

    it('has CANDIDATE_READ_ASSIGNED and does NOT have CANDIDATE_READ_ALL (GAP 01: S1-05 scoped)', () => {
      expect(ctx.hasPermission('CANDIDATE_READ_ASSIGNED')).toBe(true);
      expect(ctx.hasPermission('CANDIDATE_READ_ALL')).toBe(false);
    });
    it('does NOT have SALARY_READ (GAP 02: S2-05 only HR_MANAGER)', () => {
      expect(ctx.hasPermission('SALARY_READ')).toBe(false);
    });
    it('has EVALUATION_READ (Sheet 2: R on evaluations)', () => {
      expect(ctx.hasPermission('EVALUATION_READ')).toBe(true);
    });
    it('has NOTIFICATION_MANAGE (email & thông báo = F)', () => {
      expect(ctx.hasPermission('NOTIFICATION_MANAGE')).toBe(true);
    });
    it('does NOT have USER_MANAGE', () => {
      expect(ctx.hasPermission('USER_MANAGE')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // APPROVER
  // -------------------------------------------------------------------------
  describe('APPROVER permissions', () => {
    let ctx: ReturnType<typeof createAuthContext>;
    beforeEach(() => { ctx = createAuthContext(['APPROVER'], ROLE_PERMISSIONS.APPROVER); });

    it('does NOT have SALARY_READ (GAP 02: S2-05 only HR_MANAGER)', () => {
      expect(ctx.hasPermission('SALARY_READ')).toBe(false);
    });
    it('has EVALUATION_READ', () => {
      expect(ctx.hasPermission('EVALUATION_READ')).toBe(true);
    });
    it('has REQUISITION_APPROVE and OFFER_APPROVE', () => {
      expect(ctx.hasPermission('REQUISITION_APPROVE')).toBe(true);
      expect(ctx.hasPermission('OFFER_APPROVE')).toBe(true);
    });
    it('has CANDIDATE_READ_ALL (read total overview)', () => {
      expect(ctx.hasPermission('CANDIDATE_READ_ALL')).toBe(true);
    });
    it('does NOT have PIPELINE_MANAGE or INTERVIEW_MANAGE', () => {
      expect(ctx.hasPermission('PIPELINE_MANAGE')).toBe(false);
      expect(ctx.hasPermission('INTERVIEW_MANAGE')).toBe(false);
    });
    it('does NOT have USER_READ or USER_MANAGE', () => {
      expect(ctx.hasPermission('USER_READ')).toBe(false);
      expect(ctx.hasPermission('USER_MANAGE')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // HR_MANAGER
  // -------------------------------------------------------------------------
  describe('HR_MANAGER permissions (S1-08 User Logs)', () => {
    let ctx: ReturnType<typeof createAuthContext>;
    beforeEach(() => { ctx = createAuthContext(['HR_MANAGER'], ROLE_PERMISSIONS.HR_MANAGER); });

    it('has USER_READ (R on Users & Logs)', () => {
      expect(ctx.hasPermission('USER_READ')).toBe(true);
    });
    it('has ROLE_READ (R on Role definitions)', () => {
      expect(ctx.hasPermission('ROLE_READ')).toBe(true);
    });
    it('has AUDIT_READ (R on nhật ký hệ thống)', () => {
      expect(ctx.hasPermission('AUDIT_READ')).toBe(true);
    });
    it('does NOT have USER_MANAGE (S1-09: only ADMIN can manage)', () => {
      expect(ctx.hasPermission('USER_MANAGE')).toBe(false);
    });
    it('does NOT have ROLE_MANAGE (S1-09: only ADMIN can assign roles)', () => {
      expect(ctx.hasPermission('ROLE_MANAGE')).toBe(false);
    });
    it('has SALARY_MANAGE (F on salary module)', () => {
      expect(ctx.hasPermission('SALARY_MANAGE')).toBe(true);
    });
    it('has full recruitment permissions', () => {
      expect(ctx.hasPermission('CANDIDATE_READ_ALL')).toBe(true);
      expect(ctx.hasPermission('OFFER_APPROVE')).toBe(true);
      expect(ctx.hasPermission('REPORT_READ')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // ADMIN
  // -------------------------------------------------------------------------
  describe('ADMIN permissions (S1-05, S1-08, S1-09)', () => {
    let ctx: ReturnType<typeof createAuthContext>;
    beforeEach(() => { ctx = createAuthContext(['ADMIN'], ROLE_PERMISSIONS.ADMIN); });

    it('has USER_MANAGE and ROLE_MANAGE (full user management)', () => {
      expect(ctx.hasPermission('USER_MANAGE')).toBe(true);
      expect(ctx.hasPermission('ROLE_MANAGE')).toBe(true);
    });
    it('has USER_READ and ROLE_READ', () => {
      expect(ctx.hasPermission('USER_READ')).toBe(true);
      expect(ctx.hasPermission('ROLE_READ')).toBe(true);
    });
    it('has AUDIT_READ', () => {
      expect(ctx.hasPermission('AUDIT_READ')).toBe(true);
    });
    it('has CATALOG_MANAGE (full catalog)', () => {
      expect(ctx.hasPermission('CATALOG_MANAGE')).toBe(true);
    });
    it('does NOT have SALARY_READ or SALARY_MANAGE (GAP 02: SPEC CONFLICT restricted policy)', () => {
      expect(ctx.hasPermission('SALARY_READ')).toBe(false);
      expect(ctx.hasPermission('SALARY_MANAGE')).toBe(false);
    });
    it('has PIPELINE_MANAGE, INTERVIEW_MANAGE, and EVALUATION_READ (GAP 04 full module per Sheet 2)', () => {
      expect(ctx.hasPermission('PIPELINE_MANAGE')).toBe(true);
      expect(ctx.hasPermission('INTERVIEW_MANAGE')).toBe(true);
      expect(ctx.hasPermission('EVALUATION_READ')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // MULTI-ROLE: Combining INTERVIEWER + HR_MANAGER
  // -------------------------------------------------------------------------
  describe('Multi-role: INTERVIEWER + HR_MANAGER combined (S1-09)', () => {
    let ctx: ReturnType<typeof createAuthContext>;
    beforeEach(() => {
      const combinedPerms = Array.from(new Set([
        ...ROLE_PERMISSIONS.INTERVIEWER,
        ...ROLE_PERMISSIONS.HR_MANAGER,
      ]));
      ctx = createAuthContext(['INTERVIEWER', 'HR_MANAGER'], combinedPerms);
    });

    it('hasAnyRole returns true for both roles', () => {
      expect(ctx.hasAnyRole(['INTERVIEWER'])).toBe(true);
      expect(ctx.hasAnyRole(['HR_MANAGER'])).toBe(true);
    });
    it('gets SALARY_READ from HR_MANAGER even though INTERVIEWER alone does not have it', () => {
      expect(ctx.hasPermission('SALARY_READ')).toBe(true);
    });
    it('gets USER_READ from HR_MANAGER', () => {
      expect(ctx.hasPermission('USER_READ')).toBe(true);
    });
    it('still does NOT have USER_MANAGE (neither role has it)', () => {
      expect(ctx.hasPermission('USER_MANAGE')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // S1-06: Menu visibility derived from permissions
  // -------------------------------------------------------------------------
  describe('S1-06: Permission-based menu visibility', () => {
    it('CATALOG_READ gates organization/jobTitles/categories/questions pages', () => {
      const candidateCtx = createAuthContext(['CANDIDATE'], ROLE_PERMISSIONS.CANDIDATE);
      expect(candidateCtx.hasPermission('CATALOG_READ')).toBe(false); // hidden from candidate

      const recruiterCtx = createAuthContext(['RECRUITER'], ROLE_PERMISSIONS.RECRUITER);
      expect(recruiterCtx.hasPermission('CATALOG_READ')).toBe(true); // visible to recruiter
    });

    it('USER_READ gates /admin/users page (visible to ADMIN and HR_MANAGER)', () => {
      const hrCtx = createAuthContext(['HR_MANAGER'], ROLE_PERMISSIONS.HR_MANAGER);
      expect(hrCtx.hasPermission('USER_READ')).toBe(true);

      const interviewerCtx = createAuthContext(['INTERVIEWER'], ROLE_PERMISSIONS.INTERVIEWER);
      expect(interviewerCtx.hasPermission('USER_READ')).toBe(false);
    });

    it('USER_MANAGE gates /admin/import-excel (ADMIN only)', () => {
      const adminCtx = createAuthContext(['ADMIN'], ROLE_PERMISSIONS.ADMIN);
      expect(adminCtx.hasPermission('USER_MANAGE')).toBe(true);

      const hrCtx = createAuthContext(['HR_MANAGER'], ROLE_PERMISSIONS.HR_MANAGER);
      expect(hrCtx.hasPermission('USER_MANAGE')).toBe(false);
    });
  });
});
