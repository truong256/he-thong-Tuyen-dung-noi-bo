import { test, expect } from '@playwright/test';

test.describe('Question Bank E2E & Visual Verification', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Login as admin
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"], input#email', 'admin@company.com');
    await page.fill('input[type="password"], input#password', 'Password123@');
    await page.click('button[type="submit"]');

    // 2. Wait until redirected to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('navigates to question bank, loads questions, and opens add modal', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // 1. Navigate to /questions
    await page.goto('/questions');
    await page.waitForLoadState('networkidle');

    // 2. Verify page header
    await expect(page.locator('h1')).toContainText('Ngân hàng Câu hỏi Phỏng vấn');
    await expect(page.locator('.qb-badge-code')).toContainText('ATS-QUESTION-BANK');

    // 3. Verify metrics row is visible
    await expect(page.locator('.qb-metrics-row')).toBeVisible();

    // 4. Verify search and filter inputs are visible
    const searchInput = page.locator('#input-search-question');
    await expect(searchInput).toBeVisible();

    // 5. Check if "Thêm câu hỏi mới" button is present and opens modal
    const addBtn = page.locator('#btn-add-question');
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await expect(page.locator('h3:has-text("Thêm mới Câu hỏi Phỏng vấn")')).toBeVisible();

      // Close modal
      await page.click('button:has-text("Hủy bỏ")');
      await expect(page.locator('h3:has-text("Thêm mới Câu hỏi Phỏng vấn")')).not.toBeVisible();
    }

    // 6. Verify no critical uncaught page errors
    const severeErrors = consoleErrors.filter(
      (err) => !err.includes('favicon.ico') && !err.includes('Failed to load resource')
    );
    expect(severeErrors).toHaveLength(0);
  });
});
