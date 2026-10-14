import { test, expect } from '@playwright/test';

test.describe('First Login Mandatory Password Change E2E Test Suite', () => {
  const newSecurePassword = 'NewSecurePass2026!@#';

  const createTestUser = async (request: any) => {
    const uniqueId = `${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
    const email = `firstlogin.${uniqueId}@company.local`;
    const fullName = `Nhan Vien Test ${uniqueId}`;

    const adminLoginRes = await request.post('http://localhost:8080/api/auth/login', {
      data: { email: 'admin@company.com', password: 'Password123@' },
    });
    expect(adminLoginRes.status()).toBe(200);
    const adminToken = (await adminLoginRes.json()).accessToken;

    const createUserRes = await request.post('http://localhost:8080/api/admin/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        email,
        fullName,
        department: 'Phòng Phát Triển',
        roles: ['RECRUITER'],
        status: 'ACTIVE',
      },
    });
    expect(createUserRes.status()).toBe(201);
    const data = await createUserRes.json();
    return {
      email,
      fullName,
      temporaryPassword: data.temporaryPassword,
    };
  };

  test('Backend strictly rejects business API with 403 Forbidden when mustChangePassword is true', async ({ request }) => {
    const user = await createTestUser(request);

    // Login with temporary password
    const loginRes = await request.post('http://localhost:8080/api/auth/login', {
      data: {
        email: user.email,
        password: user.temporaryPassword,
      },
    });
    expect(loginRes.status()).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData.mustChangePassword).toBe(true);
    const tempJwtToken = loginData.accessToken;

    // Try to access business API /api/auth/profile
    const profileRes = await request.get('http://localhost:8080/api/auth/profile', {
      headers: {
        Authorization: `Bearer ${tempJwtToken}`,
      },
    });
    expect(profileRes.status()).toBe(403);
    const profileData = await profileRes.json();
    expect(profileData.mustChangePassword).toBe(true);

    // Try to access /api/departments
    const deptRes = await request.get('http://localhost:8080/api/departments', {
      headers: {
        Authorization: `Bearer ${tempJwtToken}`,
      },
    });
    expect(deptRes.status()).toBe(403);
  });

  test('Full Browser Flow: login with temp password -> redirect to /first-login/change-password -> validate policy -> change password -> redirect /login -> login with new password', async ({ page, request }) => {
    const user = await createTestUser(request);
    const viewport = page.viewportSize();
    const width = viewport?.width ?? 1280;
    const height = viewport?.height ?? 800;

    // 1. Visit Login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 2. Fill login form with temporary password
    await page.locator('#login-email').fill(user.email);
    await page.locator('#login-password').fill(user.temporaryPassword);
    await page.locator('#login-submit-btn').click();

    // 3. User is NOT allowed to enter Dashboard, redirected to /first-login/change-password
    await page.waitForURL('**/first-login/change-password', { timeout: 10000 });
    expect(page.url()).toContain('/first-login/change-password');

    // Screenshot first login screen for visual verification
    await page.screenshot({ path: `../first-login-screen-${width}x${height}.png`, fullPage: false });

    // 4. Verify elements on FirstLoginChangePasswordPage
    await expect(page.locator('h2')).toContainText('Đổi mật khẩu lần đầu');
    await expect(page.getByText(user.email)).toBeVisible();
    await expect(page.locator('#first-login-current-pwd')).toBeVisible();
    await expect(page.locator('#first-login-new-pwd')).toBeVisible();
    await expect(page.locator('#first-login-confirm-pwd')).toBeVisible();

    // Submit button should be disabled when empty
    const submitBtn = page.locator('#first-login-submit-btn');
    await expect(submitBtn).toBeDisabled();

    // 5. Try manually navigating to /dashboard while mustChangePassword is true
    await page.goto('/dashboard');
    await page.waitForURL('**/first-login/change-password');
    expect(page.url()).toContain('/first-login/change-password');

    // 6. Test Policy Validation:
    // Fill current password
    await page.locator('#first-login-current-pwd').fill(user.temporaryPassword);

    // Weak new password (no digits, no uppercase, < 8 chars)
    await page.locator('#first-login-new-pwd').fill('weak');
    await page.locator('#first-login-confirm-pwd').fill('weak');
    await expect(submitBtn).toBeDisabled();

    // Matching temporary password (cannot reuse temp password)
    await page.locator('#first-login-new-pwd').fill(user.temporaryPassword);
    await page.locator('#first-login-confirm-pwd').fill(user.temporaryPassword);
    await expect(submitBtn).toBeDisabled();

    // Mismatched confirm password
    await page.locator('#first-login-new-pwd').fill(newSecurePassword);
    await page.locator('#first-login-confirm-pwd').fill('DifferentPassword123!');
    await expect(submitBtn).toBeDisabled();
    await expect(page.getByText('Mật khẩu xác nhận chưa khớp')).toBeVisible();

    // 7. Fill valid new password and matching confirm password
    await page.locator('#first-login-confirm-pwd').fill(newSecurePassword);
    await expect(page.getByText('Mật khẩu xác nhận khớp')).toBeVisible();
    await expect(submitBtn).toBeEnabled();

    // 8. Submit password change
    await submitBtn.click();

    // 9. Verify redirected to /login with success notification
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
    await expect(page.locator('.auth-error-banner.is-success')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.auth-error-banner.is-success')).toContainText('Đổi mật khẩu thành công');

    // Screenshot success notification on login screen
    await page.screenshot({ path: `../first-login-success-login-${width}x${height}.png`, fullPage: false });

    // 10. Verify old temporary password is now rejected
    await page.locator('#login-email').fill(user.email);
    await page.locator('#login-password').fill(user.temporaryPassword);
    await page.locator('#login-submit-btn').click();
    await expect(page.locator('.auth-error-banner')).toContainText('Email hoặc mật khẩu không chính xác');

    // 11. Login with NEW password
    await page.locator('#login-password').fill(newSecurePassword);
    await page.locator('#login-submit-btn').click();

    // 12. User now enters /dashboard normally
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('Logout button on first login page safely logs out user', async ({ page, request }) => {
    const user = await createTestUser(request);

    // Login
    await page.goto('/login');
    await page.locator('#login-email').fill(user.email);
    await page.locator('#login-password').fill(user.temporaryPassword);
    await page.locator('#login-submit-btn').click();

    // Redirected to /first-login/change-password
    await page.waitForURL('**/first-login/change-password');
    const logoutBtn = page.locator('#first-login-logout-btn');
    await expect(logoutBtn).toBeVisible();

    // Click logout
    await logoutBtn.click();
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });
});
