import { test, expect } from '@playwright/test';

test.describe('Frontend UI Smoke Test', () => {
  test('login page loads, renders correctly without horizontal overflow or critical console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Capture browser console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture uncaught page errors
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    // 1. Navigate to root / login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 2. Verify body and main elements are rendered
    const body = page.locator('body');
    await expect(body).toBeVisible();

    const mainContainer = page.locator('.auth-split-viewport');
    await expect(mainContainer).toBeVisible();

    // 3. Verify Login Card inputs and submit button
    const emailInput = page.locator('input[type="email"], input#email');
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"], input#password');
    await expect(passwordInput).toBeVisible();

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();

    // 4. Inspect horizontal overflow: scrollWidth should not exceed clientWidth
    const isOverflowingHorizontally = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowingHorizontally).toBeFalsy();

    // 5. Inspect console errors (filter out known harmless network errors if any)
    const severeErrors = consoleErrors.filter(
      (err) =>
        !err.includes('favicon.ico') &&
        !err.includes('ERR_CONNECTION_REFUSED') &&
        !err.includes('Failed to load resource')
    );
    expect(severeErrors).toHaveLength(0);
  });

  test('forgot password page renders with polished enterprise typography and button styling', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    const card = page.locator('.auth-card');
    await expect(card).toBeVisible();

    const submitBtn = page.locator('.btn-submit');
    await expect(submitBtn).toBeVisible();

    const metrics = await page.evaluate(() => {
      const btn = document.querySelector('.btn-submit');
      const bStyle = btn ? window.getComputedStyle(btn) : null;
      return {
        fontFamily: bStyle?.fontFamily,
        height: bStyle?.height,
        bg: bStyle?.backgroundImage,
      };
    });

    expect(metrics.fontFamily).toContain('Be Vietnam Pro');
    expect(metrics.height).toBe('46px');

    const width = page.viewportSize()?.width || 1440;
    if (width === 1440) {
      await page.screenshot({
        path: '../forgot_password_fixed.png',
        fullPage: false,
      });
    }
  });
});
