import { test, expect } from '@playwright/test';

test.describe('Admin Create User End-to-End Verification', () => {
  test('Admin logs in, creates a new user, verifies API response, toast, table display and persistence across reload', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `test.e2e.${timestamp}@company.local`;
    const testFullName = `Nguyen Van Test ${timestamp}`;
    const testDepartment = 'Phòng Kỹ Thuật';

    const viewport = page.viewportSize();
    const width = viewport?.width ?? 1280;

    // 1. Navigate to login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 2. Login as Admin
    await page.locator('input[type="email"]').fill('admin@company.com');
    await page.locator('input[type="password"]').fill('Password123@');
    await page.locator('button[type="submit"]').click();

    // 3. Wait for Dashboard and navigate to User Management
    await page.waitForURL('**/dashboard');
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // 4. Click "Thêm tài khoản" button
    const addAccountBtn = page.locator('button:has-text("Thêm tài khoản")');
    await expect(addAccountBtn).toBeVisible();
    await addAccountBtn.click();

    // 5. Verify modal is visible
    const modal = page.locator('.modal-box.user-form-modal-box');
    await expect(modal).toBeVisible();
    await expect(page.locator('#add-user-modal-title')).toHaveText('Thêm tài khoản nhân viên nội bộ');

    // 6. Fill in user form
    await page.locator('#newFullName').fill(testFullName);
    await page.locator('#newEmail').fill(testEmail);
    await page.locator('#newDepartment').fill(testDepartment);

    // 7. Verify RECRUITER checkbox is checked by default
    const recruiterCheckbox = modal.locator('label:has-text("Chuyên viên tuyển dụng") input');
    await expect(recruiterCheckbox).toBeChecked();

    // 8. Setup network response interceptor for POST /api/admin/users
    const createResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/admin/users') && response.request().method() === 'POST'
    );

    // 9. Submit the form
    const submitBtn = modal.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 10. Verify HTTP 201 Created from backend
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    const responseJson = await createResponse.json();
    expect(responseJson.email).toBe(testEmail);
    expect(responseJson.fullName).toBe(testFullName);
    expect(responseJson.department).toBe(testDepartment);
    expect(responseJson.status).toBe('ACTIVE');

    // 11. Verify success toast notification
    const toast = page.locator('.toast-notification.success');
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toContainText(`Tạo thành công tài khoản cho ${testEmail}`);

    // 12. Verify modal is closed
    await expect(modal).not.toBeVisible();

    // 13. Search for the newly created user in the user list
    const searchInput = page.locator('.search-wrap input');
    await searchInput.fill(testEmail);
    await page.waitForTimeout(500); // Wait for debounce

    // Verify user appears in list (responsive selector: table if width > 640, card if <= 640)
    const userElement = width > 640
      ? page.locator('.custom-table .user-email-text', { hasText: testEmail })
      : page.locator('.mobile-card-email', { hasText: testEmail });
    await expect(userElement).toBeVisible({ timeout: 5000 });

    // 14. Persistence check: Reload page and confirm user still exists
    await page.reload();
    await page.waitForLoadState('networkidle');

    const searchInputAfterReload = page.locator('.search-wrap input');
    await searchInputAfterReload.fill(testEmail);
    await page.waitForTimeout(500);

    const userElementAfterReload = width > 640
      ? page.locator('.custom-table .user-email-text', { hasText: testEmail })
      : page.locator('.mobile-card-email', { hasText: testEmail });
    await expect(userElementAfterReload).toBeVisible({ timeout: 5000 });

    // Take screenshot of verified creation
    await page.screenshot({ path: `../admin-created-user-${width}.png`, fullPage: false });
  });
});
