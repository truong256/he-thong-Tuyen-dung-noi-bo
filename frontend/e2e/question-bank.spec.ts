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

  test('navigates to question bank, tests empty state, opens modal, and verifies layout', async ({ page }) => {
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

    // 5. Test empty state card by typing non-existent search term
    await searchInput.fill('__non_existent_query_xyz_123__');
    await page.waitForTimeout(500);

    // Verify empty state is rendered as a clean card
    const emptyState = page.locator('.qb-empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState.locator('.qb-empty-title')).toContainText('Không tìm thấy câu hỏi nào');
    await expect(emptyState.locator('.qb-empty-desc')).toBeVisible();

    // Test clicking "+ Thêm câu hỏi ngay" button in empty state
    const emptyAddBtn = page.locator('#btn-add-question-empty');
    if (await emptyAddBtn.isVisible()) {
      await emptyAddBtn.click();

      // Verify modal opened as a real dialog
      const modalBackdrop = page.locator('.qb-modal-backdrop');
      await expect(modalBackdrop).toBeVisible();
      await expect(page.locator('.qb-modal-card')).toBeVisible();
      await expect(page.locator('.qb-modal-title')).toContainText('Thêm mới Câu hỏi Phỏng vấn');
      await expect(page.locator('.qb-modal-subtitle')).toContainText('Tạo mới câu hỏi và gán vào khung năng lực tiêu chuẩn');

      // Verify form controls exist
      await expect(page.locator('#qb-questionText')).toBeVisible();
      await expect(page.locator('#qb-criterion')).toBeVisible();
      await expect(page.locator('#qb-difficulty')).toBeVisible();
      await expect(page.locator('#qb-category')).toBeVisible();
      await expect(page.locator('#qb-suggestedAnswer')).toBeVisible();

      // Close modal using close button X
      await page.locator('.qb-modal-close-btn').click();
      await expect(modalBackdrop).not.toBeVisible();
    }

    // Clear search term
    await searchInput.fill('');
    await page.waitForTimeout(400);

    // 6. Test opening modal from header button
    const headerAddBtn = page.locator('#btn-add-question');
    if (await headerAddBtn.isVisible()) {
      await headerAddBtn.click();
      const modalBackdrop = page.locator('.qb-modal-backdrop');
      await expect(modalBackdrop).toBeVisible();

      // Test validation: submit empty form
      await page.locator('.qb-modal-footer button[type="submit"]').click();
      await expect(page.locator('.qb-form-error-banner')).toBeVisible();
      await expect(page.locator('.qb-form-error-banner')).toContainText('Vui lòng nhập nội dung câu hỏi');

      // Fill valid question data
      const uniqueSuffix = Date.now().toString().slice(-4);
      const testQuestionText = `Câu hỏi kiểm thử tự động ${uniqueSuffix}: Bạn xử lý deadlock trong cơ sở dữ liệu như thế nào?`;
      await page.fill('#qb-questionText', testQuestionText);

      // Select criterion if available
      const criterionSelect = page.locator('#qb-criterion');
      const optionsCount = await criterionSelect.locator('option').count();
      if (optionsCount > 1) {
        await criterionSelect.selectOption({ index: 1 });
      }

      await page.selectOption('#qb-difficulty', 'MEDIUM');
      await page.fill('#qb-category', 'Database SQL');
      await page.fill('#qb-suggestedAnswer', 'Phân tích lock graph, query kill, thiết lập deadlock timeout và retry pattern.');

      // Submit form
      const [response] = await Promise.all([
        page.waitForResponse(
          (res) => res.url().includes('/api/questions') && res.request().method() === 'POST',
          { timeout: 10000 }
        ),
        page.locator('.qb-modal-footer button[type="submit"]').click(),
      ]);

      expect([200, 201]).toContain(response.status());

      // Verify modal is closed
      await expect(modalBackdrop).not.toBeVisible();

      // Verify new question appears in list
      await expect(page.locator(`text=${testQuestionText}`)).toBeVisible();

      // Verify persistence after browser reload
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator(`text=${testQuestionText}`)).toBeVisible();
    }

    // Verify no critical console errors
    const severeErrors = consoleErrors.filter(
      (err) => !err.includes('favicon.ico') && !err.includes('Failed to load resource')
    );
    expect(severeErrors).toHaveLength(0);
  });
});
