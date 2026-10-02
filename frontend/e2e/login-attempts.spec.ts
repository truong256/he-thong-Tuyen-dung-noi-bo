import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1366', width: 1366, height: 768 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
];

test.describe('Login Remaining Attempts & Lockout UI Verification', () => {
  for (const vp of VIEWPORTS) {
    test(`shows remaining login attempts badge on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // First unlock truong256 if needed to ensure attempts start cleanly
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

      // Verify error text and remaining badge
      const errorText = page.locator('.auth-error-text');
      await expect(errorText).toContainText('Email hoặc mật khẩu không chính xác.');

      const remainingBadge = page.locator('.auth-remaining-badge');
      await expect(remainingBadge).toBeVisible();
      await expect(remainingBadge).toContainText('Số lượt thử còn lại:');

      // Check for horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

      // Screenshot for visual quality inspection
      await page.screenshot({ path: `login-remaining-attempts-${vp.name}.png`, fullPage: false });

      // Now enter correct password to verify successful login and attempts reset
      await passwordInput.fill('#r7GDs^QRbhF');
      await submitBtn.click();

      // Should redirect away from /login
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
      expect(page.url()).not.toContain('/login');
    });
  }
});
