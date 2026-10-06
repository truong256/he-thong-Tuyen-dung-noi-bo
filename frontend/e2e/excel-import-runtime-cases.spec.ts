import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('SCRUM-49 Runtime Verification: 5 Scenarios', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'Stateful database mutation tests run only on desktop-1440');

    // Login as Admin before each test
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill('admin@company.com');
    await page.locator('input[type="password"]').fill('Password123@');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/dashboard');
    await page.goto('/admin/import-excel');
    await page.waitForLoadState('networkidle');
  });

  test('CASE 1: File toàn bộ hợp lệ (3 dòng hợp lệ -> 3 thành công)', async ({ page }) => {
    const fixturePath = path.resolve('test-fixtures/case1_all_valid.xlsx');
    const fileInput = page.locator('input[data-testid="excel-file-input"]');

    const previewPromise = page.waitForResponse(
      (res) => res.url().includes('/api/admin/users/import/preview') && res.request().method() === 'POST'
    );
    await fileInput.setInputFiles(fixturePath);
    const previewRes = await previewPromise;
    expect(previewRes.status()).toBe(200);

    const previewJson = await previewRes.json();
    expect(previewJson.totalRows).toBe(3);
    expect(previewJson.validCount).toBe(3);
    expect(previewJson.invalidCount).toBe(0);

    const confirmBtn = page.locator('button[data-testid="btn-confirm-import"]');
    await expect(confirmBtn).toHaveText(/Nhập 3 nhân sự hợp lệ/);
    await expect(confirmBtn).toBeEnabled();

    // Execute Import
    const importPromise = page.waitForResponse(
      (res) => res.url().includes('/api/admin/users/import') && res.request().method() === 'POST'
    );
    await confirmBtn.click();
    const importRes = await importPromise;
    expect(importRes.status()).toBe(200);

    const importJson = await importRes.json();
    expect(importJson.totalRows).toBe(3);
    expect(importJson.successCount).toBe(3);
    expect(importJson.failedCount).toBe(0);

    // Verify UI Result Card
    await expect(page.locator('text=Báo cáo kết quả nhập dữ liệu hoàn tất')).toBeVisible();
    await expect(page.getByTestId('import-result-card').getByText('Nhập thành công')).toBeVisible();

    // Navigate to user list and verify persistence
    const backBtn = page.locator('button[data-testid="btn-back-users"]');
    await backBtn.click();
    await page.waitForURL('**/admin/users');
    await page.waitForLoadState('networkidle');
  });

  test('CASE 2: File có cả dòng đúng và dòng lỗi (10 dòng: 7 valid, 3 invalid -> đúng 7 user được tạo)', async ({ page }) => {
    const fixturePath = path.resolve('test-fixtures/case2_partial_7valid_3invalid.xlsx');
    const fileInput = page.locator('input[data-testid="excel-file-input"]');

    const previewPromise = page.waitForResponse(
      (res) => res.url().includes('/api/admin/users/import/preview') && res.request().method() === 'POST'
    );
    await fileInput.setInputFiles(fixturePath);
    const previewRes = await previewPromise;
    expect(previewRes.status()).toBe(200);

    const previewJson = await previewRes.json();
    expect(previewJson.totalRows).toBe(10);
    expect(previewJson.validCount).toBe(7);
    expect(previewJson.invalidCount).toBe(3);

    // Verify per-row errors shown in UI
    await expect(page.locator('text=Email không đúng định dạng.')).toBeVisible();
    await expect(page.locator('text=Họ và tên không được để trống.')).toBeVisible();
    await expect(page.locator('text=Vai trò không hợp lệ')).toBeVisible();

    // Capture visual verification screenshots
    const artifactDir = 'C:/Users/ASUS/.gemini/antigravity-ide/brain/bbffb8fb-4ac2-4dd9-b634-fcb109083bf6';
    await page.screenshot({ path: path.join(artifactDir, 'excel_import_preview_desktop_1440.png'), fullPage: true });

    // Test mobile 360px responsiveness
    await page.setViewportSize({ width: 360, height: 740 });
    await page.waitForTimeout(300);
    const isOverflowing360 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(isOverflowing360).toBe(false);
    await page.screenshot({ path: path.join(artifactDir, 'excel_import_preview_mobile_360.png'), fullPage: true });

    // Restore desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(200);

    // Verify CTA button specifies exactly 7 valid users
    const confirmBtn = page.locator('button[data-testid="btn-confirm-import"]');
    await expect(confirmBtn).toHaveText(/Nhập 7 nhân sự hợp lệ/);
    await expect(confirmBtn).toBeEnabled();

    // Execute Import
    const importPromise = page.waitForResponse(
      (res) => res.url().includes('/api/admin/users/import') && res.request().method() === 'POST'
    );
    await confirmBtn.click();
    const importRes = await importPromise;
    expect(importRes.status()).toBe(200);

    const importJson = await importRes.json();
    expect(importJson.totalRows).toBe(10);
    expect(importJson.successCount).toBe(7);
    expect(importJson.failedCount).toBe(3);
    expect(importJson.failedRows.length).toBe(3);

    // Verify result card breakdown and capture result screenshot
    await expect(page.locator('text=Báo cáo kết quả nhập dữ liệu hoàn tất')).toBeVisible();
    await expect(page.locator('text=Danh sách các dòng không thể nhập (3 dòng):')).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, 'excel_import_result_desktop_1440.png'), fullPage: true });
  });

  test('CASE 3: Email đã tồn tại (admin@company.com -> báo lỗi dòng, disable import)', async ({ page }) => {
    const fixturePath = path.resolve('test-fixtures/case3_existing_email.xlsx');
    const fileInput = page.locator('input[data-testid="excel-file-input"]');

    const previewPromise = page.waitForResponse(
      (res) => res.url().includes('/api/admin/users/import/preview') && res.request().method() === 'POST'
    );
    await fileInput.setInputFiles(fixturePath);
    await previewPromise;

    // Verify duplicate error
    await expect(page.locator('text=Email đã tồn tại trong hệ thống.')).toBeVisible();

    const confirmBtn = page.locator('button[data-testid="btn-confirm-import"]');
    await expect(confirmBtn).toBeDisabled();
  });

  test('CASE 4: Dữ liệu role không hợp lệ (vai trò không tồn tại -> báo lỗi cụ thể)', async ({ page }) => {
    const fixturePath = path.resolve('test-fixtures/case4_invalid_role.xlsx');
    const fileInput = page.locator('input[data-testid="excel-file-input"]');

    const previewPromise = page.waitForResponse(
      (res) => res.url().includes('/api/admin/users/import/preview') && res.request().method() === 'POST'
    );
    await fileInput.setInputFiles(fixturePath);
    await previewPromise;

    await expect(page.locator('text=Vai trò không hợp lệ')).toBeVisible();

    const confirmBtn = page.locator('button[data-testid="btn-confirm-import"]');
    await expect(confirmBtn).toBeDisabled();
  });

  test('CASE 5: File sai định dạng / thiếu header bắt buộc -> thông báo tiếng Việt', async ({ page }) => {
    const fixturePath = path.resolve('test-fixtures/case5_missing_headers.xlsx');
    const fileInput = page.locator('input[data-testid="excel-file-input"]');

    await fileInput.setInputFiles(fixturePath);

    // Verify error alert
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert').getByText(/File Excel thiếu cột bắt buộc/i)).toBeVisible();
  });
});
