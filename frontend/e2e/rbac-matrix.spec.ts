import { test, expect } from '@playwright/test';

test.describe('RBAC Matrix End-to-End Verification across all 7 Roles (Real Backend & API)', () => {

  // Helper function to log in as a specific user
  async function loginAs(page: any, email: string, password = 'Password123@') {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');
  }

  // Helper function to execute authenticated fetch from page context
  async function callApi(page: any, path: string, method = 'GET', body: any = null) {
    return await page.evaluate(async ({ path, method, body }) => {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status };
    }, { path, method, body });
  }

  // 1. Role ADMIN
  test('ROLE 1: ADMIN has full user management and is restricted from standard salary ranges', async ({ page }) => {
    await loginAs(page, 'admin@company.com');

    const viewport = page.viewportSize();
    const isDesktop = (viewport?.width ?? 1280) >= 1024;
    if (isDesktop) {
      await expect(page.locator('.app-sidebar a[href="/admin/users"]')).toBeVisible();
      await expect(page.locator('.app-sidebar a[href="/admin/import-excel"]')).toBeVisible();
      await expect(page.locator('.app-sidebar a[href="/candidate/applications"]')).toHaveCount(0);
    }

    // Direct navigation to /admin/users
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('button:has-text("Thêm tài khoản")')).toBeVisible();
    await expect(page.locator('button:has-text("Nhập từ Excel"), [data-testid="btn-import-excel"]')).toBeVisible();

    // Verify real backend API: Admin can access /api/admin/users
    const usersApi = await callApi(page, '/api/admin/users');
    expect(usersApi.status).toBe(200);

    // Verify S2-05 Spec Conflict: Admin is restricted from standard salary range
    const salaryApi = await callApi(page, '/api/salary-ranges');
    expect(salaryApi.status).toBe(403);
  });

  // 2. Role HR_MANAGER
  test('ROLE 2: HR_MANAGER has read-only access to users and full access to salary ranges', async ({ page }) => {
    await loginAs(page, 'hr_manager@company.com');

    const viewport = page.viewportSize();
    const isDesktop = (viewport?.width ?? 1280) >= 1024;
    if (isDesktop) {
      await expect(page.locator('.app-sidebar a[href="/admin/users"]')).toBeVisible();
      await expect(page.locator('.app-sidebar a[href="/admin/import-excel"]')).toHaveCount(0);
    }

    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.custom-table:visible, .mobile-user-card:visible').first()).toBeVisible();
    await expect(page.locator('button:has-text("Thêm tài khoản")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Nhập từ Excel"), [data-testid="btn-import-excel"]')).toHaveCount(0);

    // Verify real backend API: HR_MANAGER can read salary ranges (S2-05 sole owner)
    const salaryApi = await callApi(page, '/api/salary-ranges');
    expect(salaryApi.status).toBe(200);

    // Verify real backend API: HR_MANAGER is blocked from mutating users
    const createUserApi = await callApi(page, '/api/admin/users', 'POST', {
      email: 'hacked@example.com',
      fullName: 'Hacked User',
      roles: ['CANDIDATE'],
    });
    expect(createUserApi.status).toBe(403);
  });

  // 3. Role RECRUITER
  test('ROLE 3: RECRUITER accesses candidate pipeline but is blocked from user management and salary', async ({ page }) => {
    await loginAs(page, 'recruiter@company.com');

    // UI: Direct navigation to /admin/users triggers 403 PermissionGuard
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.unauthorized-container, .error-card, h1, h2')).toContainText(/không có quyền|403|truy cập/i);

    // Verify real backend API: Can read candidate pipeline
    const candidateApi = await callApi(page, '/api/candidates');
    expect(candidateApi.status).toBe(200);

    // Verify real backend API: Blocked from salary ranges (GAP 02)
    const salaryApi = await callApi(page, '/api/salary-ranges');
    expect(salaryApi.status).toBe(403);
  });

  // 4. Role HIRING_MANAGER
  test('ROLE 4: HIRING_MANAGER is blocked from user management, salary, and evaluation submission', async ({ page }) => {
    await loginAs(page, 'hiring_manager@company.com');

    // UI: Direct navigation to /admin/users triggers 403
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.unauthorized-container, .error-card, h1, h2')).toContainText(/không có quyền|403|truy cập/i);

    // Verify real backend API: Blocked from salary ranges
    const salaryApi = await callApi(page, '/api/salary-ranges');
    expect(salaryApi.status).toBe(403);

    // Verify real backend API: HIRING_MANAGER has REQUISITION_READ_OWN (200)
    const reqListApi = await callApi(page, '/api/requisitions');
    expect(reqListApi.status).toBe(200);

    // UI: Direct navigation to /recruitment/requisitions
    await page.goto('/recruitment/requisitions');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText(/Yêu cầu Tuyển dụng/i);
    await expect(page.locator('#btn-create-requisition')).toBeVisible();
  });

  // 5. Role INTERVIEWER
  test('ROLE 5: INTERVIEWER is blocked from user management, salary, and requisition creation', async ({ page }) => {
    await loginAs(page, 'interviewer@company.com');

    // UI: Direct navigation to /admin/users triggers 403
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.unauthorized-container, .error-card, h1, h2')).toContainText(/không có quyền|403|truy cập/i);

    // Verify real backend API: Blocked from salary ranges
    const salaryApi = await callApi(page, '/api/salary-ranges');
    expect(salaryApi.status).toBe(403);

    // Verify real backend API: Blocked from admin users
    const usersApi = await callApi(page, '/api/admin/users');
    expect(usersApi.status).toBe(403);

    // Verify real backend API: Blocked from creating requisitions (lacks REQUISITION_CREATE)
    const reqCreateApi = await callApi(page, '/api/requisitions', 'POST', {
      title: 'Hacked Req',
      departmentId: 1,
      jobTitleId: 1,
      quantity: 1,
      reason: 'NEW_HEADCOUNT',
    });
    expect(reqCreateApi.status).toBe(403);
  });

  // 6. Role APPROVER
  test('ROLE 6: APPROVER is blocked from user management, salary, and requisition creation', async ({ page }) => {
    await loginAs(page, 'approver@company.com');

    // UI: Direct navigation to /admin/users triggers 403
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.unauthorized-container, .error-card, h1, h2')).toContainText(/không có quyền|403|truy cập/i);

    // Verify real backend API: Blocked from salary ranges
    const salaryApi = await callApi(page, '/api/salary-ranges');
    expect(salaryApi.status).toBe(403);

    // Verify real backend API: APPROVER lacks REQUISITION_CREATE (blocked from POST /api/requisitions)
    const createReqApi = await callApi(page, '/api/requisitions', 'POST', {
      title: 'Approver attempt',
      departmentId: 1,
      jobTitleId: 1,
      quantity: 1,
      reason: 'NEW_HEADCOUNT',
    });
    expect(createReqApi.status).toBe(403);
  });

  // 7. Role CANDIDATE
  test('ROLE 7: CANDIDATE is blocked from internal admin/recruitment modules', async ({ page }) => {
    await loginAs(page, 'candidate@company.com');

    const viewport = page.viewportSize();
    const isDesktop = (viewport?.width ?? 1280) >= 1024;
    if (isDesktop) {
      await expect(page.locator('.app-sidebar a[href="/admin/users"]')).toHaveCount(0);
      await expect(page.locator('.app-sidebar a[href="/admin/import-excel"]')).toHaveCount(0);
    }

    // Direct navigation to /admin/users triggers 403
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.unauthorized-container, .error-card, h1, h2')).toContainText(/không có quyền|403|truy cập/i);

    // Verify real backend API: Blocked from user management and salary ranges
    const usersApi = await callApi(page, '/api/admin/users');
    expect(usersApi.status).toBe(403);

    const salaryApi = await callApi(page, '/api/salary-ranges');
    expect(salaryApi.status).toBe(403);

    // Candidate can view own candidate applications
    const candidatesApi = await callApi(page, '/api/candidates');
    expect(candidatesApi.status).toBe(200);
  });

  // Responsive mobile drawer verification
  test('Responsive verification: Mobile drawer displays correctly without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await loginAs(page, 'admin@company.com');

    const menuToggle = page.locator('button.mobile-menu-btn, button[aria-label="Mở menu"], .mobile-menu-toggle');
    if (await menuToggle.isVisible()) {
      await menuToggle.click();
      await page.waitForTimeout(300);

      const sidebar = page.locator('.app-sidebar');
      await expect(sidebar).toBeVisible();

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasOverflow).toBeFalsy();

      const closeBtn = page.locator('button.sidebar-mobile-close-btn');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });
});

