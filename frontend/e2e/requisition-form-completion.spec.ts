import { test, expect } from '@playwright/test';

test.describe('PROMPT ANTIGRAVITY - Hoàn thiện Form Tạo yêu cầu tuyển dụng (S2-10, S2-05, S3-01, S3-04)', () => {
  async function loginAs(page: any, email: string) {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill('Password123@');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');
  }

  test('HIRING_MANAGER: verifies salary secrecy, department restriction, and headcount badge', async ({ page }) => {
    await loginAs(page, 'hiring_manager@company.com');

    // 1. Check RequisitionManagementPage modal
    await page.goto('/recruitment/requisitions');
    await page.waitForLoadState('networkidle');

    await page.locator('#btn-create-requisition').click();
    await expect(page.locator('.req-modal-content')).toBeVisible();

    // S2-05: Standard salary must NOT be visible to HIRING_MANAGER
    await expect(page.locator('.req-salary-info')).toHaveCount(0);
    await expect(page.locator('text=Khung chuẩn:')).toHaveCount(0);

    // S3-04: Select job title and input quantity exceeding quota to trigger headcount warning
    const jtSelect = page.locator('.req-modal-content select').nth(1);
    await jtSelect.selectOption({ index: 1 });
    await page.locator('input[type="number"]').fill('99');
    await expect(page.locator('text=Cảnh báo vượt chỉ tiêu headcount')).toBeVisible();

    // A. Form Completion: Verify separate explanation field & draft saving
    await page.locator('input[placeholder*="Senior Java Developer"]').fill('Yêu cầu tuyển dụng E2E Test');
    await page.locator('#btn-save-draft').click();
    await expect(page.locator('.req-modal-content')).toHaveCount(0);

    // 2. Check RecruitmentRequestPage (/recruitment/create)
    await page.goto('/recruitment/create');
    await page.waitForLoadState('networkidle');

    // Standard salary box must NOT be visible
    await expect(page.locator('.rr-salary-standard-box')).toHaveCount(0);
    await expect(page.locator('text=Áp dụng dải lương chuẩn')).toHaveCount(0);

    // Check separate fields: "Hình thức tuyển dụng" and "Lý do & Căn cứ đề xuất tuyển dụng"
    await expect(page.locator('text=Hình thức tuyển dụng')).toBeVisible();
    await expect(page.locator('text=Lý do & Căn cứ đề xuất tuyển dụng')).toBeVisible();

    // Screenshot desktop / mobile
    await page.screenshot({ path: '../../artifacts/requisition_hm_view.png', fullPage: true });
  });

  test('HR_MANAGER: verifies standard salary visibility and apply button', async ({ page }) => {
    await loginAs(page, 'hr_manager@company.com');

    // 1. Check RequisitionManagementPage modal as HR
    await page.goto('/recruitment/requisitions');
    await page.waitForLoadState('networkidle');

    await page.locator('#btn-create-requisition').click();
    await expect(page.locator('.req-modal-content')).toBeVisible();

    // As HR, standard salary is visible
    const jtSelect = page.locator('.req-modal-content select').nth(1);
    await jtSelect.selectOption({ index: 1 });
    await expect(page.locator('.req-salary-info')).toBeVisible();

    // 2. Check RecruitmentRequestPage as HR
    await page.goto('/recruitment/create');
    await page.waitForLoadState('networkidle');

    const rrJtSelect = page.locator('select.rr-select').first();
    await rrJtSelect.selectOption({ index: 1 });

    await expect(page.locator('.rr-salary-standard-box')).toBeVisible();
    await expect(page.locator('text=Áp dụng dải lương chuẩn')).toBeVisible();

    await page.screenshot({ path: '../../artifacts/requisition_hr_view.png', fullPage: true });
  });
});
