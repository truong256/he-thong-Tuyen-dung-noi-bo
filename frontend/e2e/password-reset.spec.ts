import { test, expect } from '@playwright/test';

test.describe('Password Reset E2E Flow (S1-03)', () => {
  test('forgot password page renders and submits admin@company.com without exposing token or smtp details', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Intercept backend forgot-password API
    await page.route('**/api/auth/forgot-password', async (route) => {
      const postData = route.request().postDataJSON();
      expect(postData.email).toBe('admin@company.com');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Nếu email tồn tại, hướng dẫn khôi phục mật khẩu đã được gửi.',
        }),
      });
    });

    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    // Verify card rendered
    const card = page.locator('.auth-card');
    await expect(card).toBeVisible();

    // Verify horizontal overflow
    const isOverflowing = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(isOverflowing).toBeFalsy();

    // Fill email
    const emailInput = page.locator('#forgot-email');
    await emailInput.fill('admin@company.com');

    // Submit
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Success state
    const successBlock = page.locator('.forgot-success-block');
    await expect(successBlock).toBeVisible();
    await expect(successBlock).toContainText('Yêu cầu đã được gửi');
    await expect(successBlock).toContainText('Nếu email tồn tại');

    // Ensure raw token or SMTP technical details are NOT displayed
    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('token=');
    expect(bodyText).not.toContain('SMTP');
    expect(bodyText).not.toContain('sandbox.smtp.mailtrap.io');

    const severeErrors = consoleErrors.filter(
      (err) =>
        !err.includes('favicon.ico') &&
        !err.includes('ERR_CONNECTION_REFUSED') &&
        !err.includes('Failed to load resource')
    );
    expect(severeErrors).toHaveLength(0);
  });

  test('reset password page with query token validates policy, shows matching indicator, and redirects on success', async ({ page }) => {
    await page.route('**/api/auth/reset-password', async (route) => {
      const data = route.request().postDataJSON();
      expect(data.token).toBe('test-valid-reset-token');
      expect(data.newPassword).toBe('NewAdmin123@');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.',
        }),
      });
    });

    await page.goto('/reset-password?token=test-valid-reset-token');
    await page.waitForLoadState('networkidle');

    // Token input should NOT be shown because token came from URL
    await expect(page.locator('#token')).not.toBeVisible();

    // Fill new password
    const newPassInput = page.locator('#newPassword');
    await newPassInput.fill('NewAdmin123@');

    // Fill confirm password
    const confirmPassInput = page.locator('#confirmPassword');
    await confirmPassInput.fill('NewAdmin123@');

    // Match indicator should show match
    await expect(page.locator('.pwd-match-indicator.match')).toBeVisible();

    // Submit
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Success alert
    const alert = page.locator('.alert-box.success');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Đặt lại mật khẩu thành công');

    // Wait for redirect to login page
    await page.waitForURL('**/login', { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('reset password page displays clear Vietnamese error when token is expired or used', async ({ page }) => {
    const expiredErrorMessage = 'Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng.';
    await page.route('**/api/auth/reset-password', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: expiredErrorMessage }),
      });
    });

    await page.goto('/reset-password?token=expired-token-xyz');
    await page.waitForLoadState('networkidle');

    await page.locator('#newPassword').fill('NewAdmin123@');
    await page.locator('#confirmPassword').fill('NewAdmin123@');
    await page.locator('button[type="submit"]').click();

    const alert = page.locator('.alert-box.error');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(expiredErrorMessage);

    // Ensure user stays on reset password page
    expect(page.url()).toContain('/reset-password');
  });
});
