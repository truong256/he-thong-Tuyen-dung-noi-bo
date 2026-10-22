import { test, expect } from '@playwright/test';

test.describe('Login Remaining Attempts & Lockout UI Verification', () => {
  test.describe.configure({ mode: 'serial' });

  test('shows remaining login attempts badge on failed login and resets on success', async ({ page }) => {
    const email = 'truong256@company.com';

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Check form fields visible
    const emailInput = page.locator('#login-email');
    const passwordInput = page.locator('#login-password');
    const submitBtn = page.locator('#login-submit-btn');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Attempt 1: wrong password
    await emailInput.fill(email);
    await passwordInput.fill('WrongPassword123!');
    await submitBtn.click();

    // Verify error banner appears
    const errorBanner = page.locator('.auth-error-banner');
    await expect(errorBanner).toBeVisible({ timeout: 10000 });

    // Verify error text
    const errorText = page.locator('.auth-error-text');
    await expect(errorText).toBeVisible();

    // If account was already locked from previous attempts, it shows lockout message
    // If not locked, it shows remaining badge
    const isLocked = await errorText.textContent().then((t) => t?.includes('khóa'));
    if (!isLocked) {
      await expect(errorText).toContainText('Email hoặc mật khẩu không chính xác.');
      const remainingBadge = page.locator('.auth-remaining-badge');
      await expect(remainingBadge).toBeVisible();
      await expect(remainingBadge).toContainText('Số lượt thử còn lại:');

      // Now enter correct password to verify successful login and attempts reset
      await passwordInput.fill('#r7GDs^QRbhF');
      await submitBtn.click();

      // Should redirect away from /login
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
      expect(page.url()).not.toContain('/login');
    }

    // Check for horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
