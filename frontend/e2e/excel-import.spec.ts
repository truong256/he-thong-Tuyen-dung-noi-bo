import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('SCRUM-49 / SCRUM-60: Nhập danh sách nhân sự từ Excel E2E', () => {
  test('Complete Excel Import Flow: Navigation, Template Download, Validation, Responsive', async ({ page }) => {
    // 1. Login as Admin
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill('admin@company.com');
    await page.locator('input[type="password"]').fill('Password123@');
    await page.locator('button[type="submit"]').click();

    // 2. Wait for Dashboard and navigate to User Management
    await page.waitForURL('**/dashboard');
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // 3. Verify "Nhập từ Excel" button is visible and click it
    const importExcelBtn = page.locator('button[data-testid="btn-import-excel"]');
    await expect(importExcelBtn).toBeVisible();
    await importExcelBtn.click();

    // 4. Verify redirected to /admin/import-excel
    await page.waitForURL('**/admin/import-excel');
    await expect(page.locator('h1')).toHaveText('Nhập danh sách nhân sự từ Excel');

    // 5. Verify Stepper and download template button
    const downloadTemplateBtn = page.locator('button[data-testid="btn-download-template"]');
    await expect(downloadTemplateBtn).toBeVisible();

    // 6. Test Download Template from real backend API
    const downloadPromise = page.waitForEvent('download');
    await downloadTemplateBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('Mau_nhap_nhan_su.xlsx');

    // Save template to test directory for upload
    const tempDir = path.resolve('test-downloads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const templateFilePath = path.join(tempDir, `downloaded_template_${uniqueSuffix}.xlsx`);
    await download.saveAs(templateFilePath);
    expect(fs.existsSync(templateFilePath)).toBe(true);
    expect(fs.statSync(templateFilePath).size).toBeGreaterThan(100);

    // 7. Test invalid file format rejection
    const invalidFilePath = path.join(tempDir, `invalid_test_${uniqueSuffix}.txt`);
    fs.writeFileSync(invalidFilePath, 'Not an excel file content');
    const fileInput = page.locator('input[data-testid="excel-file-input"]');
    await fileInput.setInputFiles(invalidFilePath);

    await expect(page.locator('text=Định dạng tệp không được hỗ trợ')).toBeVisible();

    // 8. Test uploading valid Excel template
    const previewResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/admin/users/import/preview') && response.request().method() === 'POST'
    );

    await fileInput.setInputFiles(templateFilePath);

    const previewResponse = await previewResponsePromise;
    expect(previewResponse.status()).toBe(200);
    const previewJson = await previewResponse.json();
    expect(previewJson.totalRows).toBeGreaterThan(0);
    expect(previewJson.validCount).toBeGreaterThanOrEqual(0);

    // 9. Verify Preview table and summary chips
    await expect(page.locator('text=2. Xem trước & Kiểm tra dữ liệu từng dòng')).toBeVisible();
    await expect(page.locator('table[data-testid="preview-table"]')).toBeVisible();

    // Check table headers
    await expect(page.locator('table[data-testid="preview-table"] th:has-text("Dòng")')).toBeVisible();
    await expect(page.locator('table[data-testid="preview-table"] th:has-text("Họ và tên")')).toBeVisible();
    await expect(page.locator('table[data-testid="preview-table"] th:has-text("Email")')).toBeVisible();
    await expect(page.locator('table[data-testid="preview-table"] th:has-text("Trạng thái")')).toBeVisible();

    // 10. Verify CTA button
    const confirmBtn = page.locator('button[data-testid="btn-confirm-import"]');
    await expect(confirmBtn).toBeVisible();

    // 11. Test Responsive Viewports (1440, 768, 390, 360)
    for (const width of [1440, 768, 390, 360]) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(200);

      // Verify no horizontal overflow of the main container
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(isOverflowing).toBe(false);

      // Verify action buttons and title are visible
      await expect(page.locator('h1')).toBeVisible();
      await expect(confirmBtn).toBeVisible();
    }
  });
});
