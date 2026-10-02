import { test, expect } from '@playwright/test';

test.describe('Visual and Responsive Verification', () => {
  test('verify layout, alignment, responsive behavior, and interactions on Login Page', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 1. Form element verification
    const emailInput = page.locator('#login-email, input[type="email"]');
    const passwordInput = page.locator('#login-password');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // 2. Measure bounding boxes before typing
    const emailBox = await emailInput.boundingBox();
    const passBox = await passwordInput.boundingBox();
    expect(emailBox).not.toBeNull();
    expect(passBox).not.toBeNull();

    if (emailBox && passBox) {
      // Both inputs should have similar height (tolerance 4px)
      expect(Math.abs(emailBox.height - passBox.height)).toBeLessThanOrEqual(4);
    }

    // 3. Test form typing & interactions
    await emailInput.fill('admin@company.com');
    await passwordInput.fill('Password123@');

    // 4. Toggle password visibility
    const togglePasswordBtn = page.locator('.auth-password-toggle-btn');
    if (await togglePasswordBtn.isVisible()) {
      await togglePasswordBtn.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      await togglePasswordBtn.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }

    // 5. Check horizontal overflow across viewport
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();

    // 6. Verify no severe console errors
    const severeErrors = consoleErrors.filter(
      (e) => !e.includes('favicon.ico') && !e.includes('ERR_CONNECTION_REFUSED')
    );
    expect(severeErrors).toHaveLength(0);

    // 7. Capture screenshot into test-results
    const viewport = page.viewportSize();
    const width = viewport?.width ?? 1280;
    const height = viewport?.height ?? 800;
    await page.screenshot({
      path: `test-results/screenshot-${width}x${height}.png`,
      fullPage: true,
    });
  });
});
