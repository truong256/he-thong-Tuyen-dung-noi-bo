import { test, expect } from '@playwright/test';

test.describe('Approval Configuration - Step 1 Salary Editable (>= 0 VND)', () => {
  test.beforeEach(async ({ page }) => {
    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    // Login as HR Manager
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill('hr_manager@company.com');
    await page.locator('input[type="password"]').fill('Password123@');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('Step 1 salary threshold is immediately editable and saved successfully', async ({ page }) => {
    await page.goto('http://localhost:5173/recruitment/approval-configurations');
    await page.waitForLoadState('networkidle');

    // Ensure page header is visible
    await expect(page.locator('h1')).toContainText('Cấu hình luồng phê duyệt');

    // Click "Chỉnh sửa" or "Tạo cấu hình mới" or "Tạo cấu hình"
    const editBtn = page.getByRole('button', { name: 'Chỉnh sửa' });
    const createNewBtn = page.getByRole('button', { name: 'Tạo cấu hình mới' });
    const createBtn = page.getByRole('button', { name: 'Tạo cấu hình' });

    if (await editBtn.isVisible()) {
      await editBtn.click();
    } else if (await createNewBtn.isVisible()) {
      await createNewBtn.click();
    } else if (await createBtn.isVisible()) {
      await createBtn.click();
    }

    // Locate the first step's salary threshold input
    const step1SalaryInput = page.locator('#approval-threshold-0');
    await expect(step1SalaryInput).toBeVisible();

    // CRITICAL: Verify step 1 salary input is NOT disabled
    await expect(step1SalaryInput).toBeEnabled();

    // Verify helper text
    const helper0 = page.locator('#approval-threshold-help-0');
    await expect(helper0).toBeVisible();
    await expect(helper0).toContainText('Ngưỡng lương khởi điểm không âm (>= 0 VND).');

    // Clear and enter a positive salary threshold: 12500000
    await step1SalaryInput.fill('');
    await step1SalaryInput.pressSequentially('12500000');

    // Verify thousand separator formatting: 12,500,000
    await expect(step1SalaryInput).toHaveValue('12,500,000');

    // If there is a step 2, ensure step 2 is higher than step 1
    const step2SalaryInput = page.locator('#approval-threshold-1');
    if (await step2SalaryInput.isVisible()) {
      await step2SalaryInput.fill('');
      await step2SalaryInput.pressSequentially('35000000');
      await expect(step2SalaryInput).toHaveValue('35,000,000');
    }

    // Save configuration
    const saveBtn = page.getByRole('button', { name: 'Lưu phiên bản' });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Expect success notice
    await expect(page.locator('.approval-config-notice, [role="status"], .approval-config-state')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=12.500.000 VND')).toBeVisible({ timeout: 10000 });

    // Check responsive sizes
    const viewports = [
      { name: 'desktop_1920', width: 1920, height: 1080 },
      { name: 'desktop_1440', width: 1440, height: 900 },
      { name: 'desktop_1366', width: 1366, height: 768 },
      { name: 'tablet_768', width: 768, height: 1024 },
      { name: 'mobile_390', width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(400);

      // Verify no horizontal overflow on body
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2px margin of error for subpixel

      // Take screenshot for verification
      await page.screenshot({
        path: `C:/Users/ASUS/.gemini/antigravity-ide/brain/71a2205f-e716-495a-9239-116a7713ec96/approval_step1_salary_${vp.name}.png`,
        fullPage: true,
      });
    }
  });
});
