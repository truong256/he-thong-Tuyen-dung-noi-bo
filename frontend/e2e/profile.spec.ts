import { test, expect } from '@playwright/test';

test.describe('Admin Profile Page Modern Redesign Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Admin
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('#login-email, input[type="email"]').fill('admin@company.com');
    await page.locator('#login-password').fill('Password123@');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
  });

  test('profile header renders compact summary card with name, email, roles, and status indicator', async ({ page }) => {
    const header = page.locator('.profile-summary-header');
    await expect(header).toBeVisible();

    // Verify avatar is visible
    await expect(header.locator('.profile-header-avatar')).toBeVisible();

    // Verify name and email
    await expect(header.locator('.profile-header-name')).toContainText('Quản trị viên Hệ thống');
    await expect(header.locator('.profile-header-email')).toContainText('admin@company.com');

    // Verify roles summary
    await expect(header.locator('.profile-header-roles-text')).toContainText('Quản trị viên');

    // Verify status indicator
    await expect(header.locator('.status-indicator-text')).toContainText('Đang hoạt động');

    // Verify change password button
    await expect(header.locator('.profile-btn-change-password')).toBeVisible();

    // Verify hero does not contain raw #1 account badge
    await expect(header).not.toContainText('Mã tài khoản: #1');
  });

  test('personal info tab enforces read-only email and role, dirty state action buttons, and cancels changes', async ({ page }) => {
    const fullNameInput = page.locator('#profile-fullName');
    const emailInput = page.locator('#profile-email');
    const roleInput = page.locator('#profile-role');
    const saveBtn = page.locator('button[type="submit"]:has-text("Lưu thay đổi")');
    const cancelBtn = page.locator('button:has-text("Hủy thay đổi")');

    // Verify read-only fields
    await expect(emailInput).toBeDisabled();
    await expect(roleInput).toBeDisabled();

    // Initially save and cancel buttons are disabled
    await expect(saveBtn).toBeDisabled();
    await expect(cancelBtn).toBeDisabled();

    // Edit full name
    const originalName = await fullNameInput.inputValue();
    await fullNameInput.fill('Quản trị viên Hệ thống Đã Chỉnh Sửa');

    // Now save and cancel buttons should be enabled
    await expect(saveBtn).toBeEnabled();
    await expect(cancelBtn).toBeEnabled();

    // Click cancel button -> should revert
    await cancelBtn.click();
    await expect(fullNameInput).toHaveValue(originalName);
    await expect(saveBtn).toBeDisabled();
    await expect(cancelBtn).toBeDisabled();
  });

  test('tabs navigation switches smoothly and security tab contains zero ISO 27001 claims', async ({ page }) => {
    // 1. Switch to RBAC Tab
    await page.click('button:has-text("Vai trò & Quyền hạn")');
    await expect(page.locator('.profile-roles-card')).toBeVisible();
    await expect(page.locator('text=Vai trò được cấp')).toBeVisible();
    await expect(page.locator('text=Phân quyền vai trò RBAC')).toBeVisible();

    // 2. Switch to Security Tab
    await page.click('button:has-text("Bảo mật & Phiên làm việc")');
    await expect(page.locator('.profile-security-card')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mật khẩu tài khoản' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Phiên đăng nhập hiện tại' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Phiên đăng nhập & Token' })).toBeVisible();

    // 3. Verify absolute absence of fake ISO 27001 claim anywhere on the page
    const pageContent = await page.content();
    expect(pageContent).not.toContain('ISO 27001');
  });

  test('shows phone validation error specifically under phone input and marks phone input as invalid without affecting full name', async ({ page }) => {
    const fullNameInput = page.locator('#profile-fullName');
    const phoneInput = page.locator('#profile-phone');
    const saveBtn = page.locator('button[type="submit"]:has-text("Lưu thay đổi")');

    // Fill invalid phone (12 digits as shown in user screenshot)
    await phoneInput.fill('098234092839');
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Verify error message is displayed
    const errorMsg = page.locator('.profile-form-error-msg:has-text("Số điện thoại không đúng định dạng Việt Nam.")');
    await expect(errorMsg).toBeVisible();

    // Verify phone input is marked invalid (red border)
    await expect(phoneInput).toHaveClass(/is-invalid/);

    // CRITICAL: Full name input must NOT be marked invalid
    await expect(fullNameInput).not.toHaveClass(/is-invalid/);

    // Verify error is located within the phone form-group, not full name form-group
    const phoneGroup = page.locator('.profile-form-group:has(#profile-phone)');
    await expect(phoneGroup.locator('.profile-form-error-msg')).toContainText('Số điện thoại không đúng định dạng Việt Nam.');

    const nameGroup = page.locator('.profile-form-group:has(#profile-fullName)');
    await expect(nameGroup.locator('.profile-form-error-msg')).toHaveCount(0);

    // Correcting the phone number clears the error state
    await phoneInput.fill('0982340928');
    await expect(phoneInput).not.toHaveClass(/is-invalid/);
    await expect(phoneGroup.locator('.profile-form-error-msg')).toHaveCount(0);
  });
});
