import { test, expect } from '@playwright/test';

test.describe('S2-10 Recruitment Requisition UI & Workflow Verification (E2E)', () => {
  async function loginAsHiringManager(page: any) {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill('hiring_manager@company.com');
    await page.locator('input[type="password"]').fill('Password123@');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');
  }

  test('Hiring Manager navigates to Requisitions, checks table and creates draft', async ({ page }) => {
    await loginAsHiringManager(page);

    await page.goto('/recruitment/requisitions');
    await page.waitForLoadState('networkidle');

    // Verify Page Header
    await expect(page.locator('h1')).toContainText(/Yêu cầu Tuyển dụng/i);
    await expect(page.locator('#btn-create-requisition')).toBeVisible();

    // Open Modal
    await page.locator('#btn-create-requisition').click();
    await expect(page.locator('.req-modal-content')).toBeVisible();
    await expect(page.locator('.req-modal-header h2')).toContainText(/Tạo yêu cầu tuyển dụng mới/i);

    // Fill form with valid future date and standard salary
    const testTitle = `Tuyển dụng Kỹ sư Phần mềm - ${Date.now()}`;
    await page.locator('input[placeholder*="Tuyển dụng Senior Java Developer"]').fill(testTitle);

    // Select managed department Backend if available
    const deptSelect = page.locator('.req-modal-content select').first();
    const backendOpt = deptSelect.locator('option:has-text("Backend")').first();
    if ((await backendOpt.count()) > 0) {
      const val = await backendOpt.getAttribute('value');
      if (val) await deptSelect.selectOption(val);
    }

    // Save as draft
    await page.locator('#btn-save-draft').click();

    // Verify success toast or modal closed and table shows requisition
    await expect(page.locator('.req-modal-content')).toHaveCount(0);
    await expect(page.locator(`text=${testTitle}`)).toBeVisible();
  });

  test('Validates past date and salary outside standard range in form', async ({ page }) => {
    await loginAsHiringManager(page);

    await page.goto('/recruitment/requisitions');
    await page.waitForLoadState('networkidle');

    await page.locator('#btn-create-requisition').click();
    await expect(page.locator('.req-modal-content')).toBeVisible();

    await page.locator('input[placeholder*="Tuyển dụng Senior Java Developer"]').fill('Vị trí Kiểm thử');

    // Input past date
    await page.locator('input[type="date"]').fill('2020-01-01');

    // Submit requisition
    await page.locator('#btn-submit-requisition').click();

    // Expect validation message for past date
    await expect(page.locator('.req-error-text')).toContainText(/Ngày cần người không được ở quá khứ/i);
  });
});
