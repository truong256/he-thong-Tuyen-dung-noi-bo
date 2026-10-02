import { test, expect } from '@playwright/test';

test.describe('Session Management & Security UI Verification (Idle 30s & Password Change)', () => {
  test('Idle timeout 30s redirects to /login with Vietnamese message', async ({ page }) => {
    // Navigate to /login initially to establish origin
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Set user session with last activity older than 30s (35s ago)
    await page.evaluate(() => {
      const past = Date.now() - 35000;
      localStorage.setItem('accessToken', 'mock-session-token');
      localStorage.setItem('refreshToken', 'mock-refresh-token');
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 1,
          email: 'recruiter@company.com',
          fullName: 'Nguyễn Tuyển Dụng',
          role: 'RECRUITER',
          roles: ['RECRUITER'],
          status: 'ACTIVE',
        })
      );
      localStorage.setItem('ats:last_activity_time', past.toString());
    });

    // User attempts to access protected page (/dashboard)
    await page.goto('/dashboard');
    await page.waitForURL('**/login', { timeout: 10000 });

    // Verify user is on /login
    expect(page.url()).toContain('/login');

    // Verify required Vietnamese notification is visible
    const noticeBanner = page.locator('.auth-error-banner');
    await expect(noticeBanner).toBeVisible({ timeout: 5000 });

    const noticeText = page.locator('.auth-error-text');
    await expect(noticeText).toContainText(
      'Phiên đăng nhập đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.'
    );

    // Verify tokens were purged from client storage
    const tokenInStorage = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(tokenInStorage).toBeNull();

    // Check for horizontal overflow (must not exceed viewport)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    // Capture screenshot for visual inspection
    const vp = page.viewportSize();
    await page.screenshot({ path: `idle-timeout-${vp?.width}x${vp?.height}.png`, fullPage: false });
  });

  test('Change password notification renders cleanly with success badge', async ({ page }) => {
    // Navigate to /login to establish origin
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Set change-password success notice in sessionStorage
    await page.evaluate(() => {
      sessionStorage.setItem(
        'ats:auth_notice',
        'Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.'
      );
    });

    // Reload page to simulate arriving with notice
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify banner appears with success styling
    const successBanner = page.locator('.auth-error-banner.is-success');
    await expect(successBanner).toBeVisible({ timeout: 5000 });

    const bannerText = page.locator('.auth-error-text');
    await expect(bannerText).toContainText(
      'Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.'
    );

    // Check for horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    // Capture screenshot for visual inspection
    const vp = page.viewportSize();
    await page.screenshot({ path: `change-password-success-${vp?.width}x${vp?.height}.png`, fullPage: false });
  });
});
