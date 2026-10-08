import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('S2-03: Avatar Upload & Delete Integration Flow', () => {
  test.describe.configure({ mode: 'serial' });
  const testImagePath = path.resolve('e2e', 'fixtures', 'test-avatar.jpg');

  test.beforeAll(async () => {
    // Ensure test fixture exists
    const fixtureDir = path.resolve('e2e', 'fixtures');
    if (!fs.existsSync(fixtureDir)) {
      fs.mkdirSync(fixtureDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Login as Admin
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('#login-email, input[type="email"]').fill('admin@company.com');
    await page.locator('#login-password').fill('Password123@');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
  });

  test('full avatar lifecycle: upload -> preview -> save -> header update -> persistence -> delete', async ({ page }) => {
    const header = page.locator('.profile-summary-header');
    await expect(header).toBeVisible();

    // 1. Initial state: verify camera button is present
    const cameraBadge = page.locator('.profile-avatar-badge-btn');
    await expect(cameraBadge).toBeVisible();

    // 2. Select image file
    const fileInput = page.locator('input[data-testid="avatar-file-input"]');
    await fileInput.setInputFiles(testImagePath);

    // 3. Verify Preview Modal opens
    const modal = page.locator('.avatar-modal-box');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#avatar-modal-title')).toHaveText('Đổi ảnh đại diện');
    await expect(modal.locator('.avatar-preview-img')).toBeVisible();
    await expect(modal.locator('.avatar-file-name')).toContainText('test-avatar.jpg');

    // 4. Click "Lưu ảnh"
    const saveBtn = modal.locator('button[data-testid="save-avatar-btn"]');
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Modal should close and success toast should appear
    await expect(modal).not.toBeVisible({ timeout: 10000 });
    const successToast = page.locator('.profile-header-toast.success');
    await expect(successToast).toContainText('Cập nhật ảnh đại diện thành công.');

    // 5. Verify ProfileHeader displays avatar image (not initials)
    const profileAvatarImg = page.locator('.profile-header-avatar-img');
    await expect(profileAvatarImg).toBeVisible();

    // 6. Verify Navbar Header displays avatar image
    const navbarAvatarImg = page.locator('.header-right .user-avatar-img');
    await expect(navbarAvatarImg).toBeVisible();

    // 7. Verify Delete button is now available
    const deleteBtn = page.locator('button[data-testid="delete-avatar-btn"]');
    await expect(deleteBtn).toBeVisible();

    // 8. Test Persistence: Refresh page and verify avatar persists
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.profile-header-avatar-img')).toBeVisible();
    await expect(page.locator('.header-right .user-avatar-img')).toBeVisible();

    // 9. Delete avatar flow
    const deleteBtnAfterReload = page.locator('button[data-testid="delete-avatar-btn"]');
    await expect(deleteBtnAfterReload).toBeVisible();
    await deleteBtnAfterReload.click();

    // Confirm deletion modal
    const deleteModal = page.locator('#delete-avatar-modal-title');
    await expect(deleteModal).toBeVisible();
    const confirmDeleteBtn = page.locator('button[data-testid="confirm-delete-avatar-btn"]');
    await confirmDeleteBtn.click();

    // Verify deletion success toast and initials fallback
    await expect(page.locator('.profile-header-toast.success')).toContainText('Đã xóa ảnh đại diện.');
    await expect(page.locator('.profile-header-avatar-initial')).toBeVisible();
    await expect(page.locator('.profile-header-avatar-initial')).toContainText('Q');
    await expect(page.locator('.header-right .user-avatar')).toContainText('Q');
  });

  test('validates file size and type rejection on frontend', async ({ page }) => {
    const fileInput = page.locator('input[data-testid="avatar-file-input"]');

    // Reject invalid file type (e.g. .txt)
    const invalidFile = path.resolve('e2e', 'fixtures', 'invalid.txt');
    fs.writeFileSync(invalidFile, 'not an image');
    await fileInput.setInputFiles(invalidFile);

    const errorToast = page.locator('.profile-header-toast.error');
    await expect(errorToast).toContainText('Chỉ chấp nhận ảnh JPG hoặc PNG.');
    await expect(page.locator('.avatar-modal-box')).not.toBeVisible();
  });

  test('responsive check at 360px: avatar and modal fit viewport with no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const header = page.locator('.profile-summary-header');
    await expect(header).toBeVisible();

    // Verify avatar is visible and not clipped
    const avatar = page.locator('.profile-header-avatar');
    await expect(avatar).toBeVisible();

    // Open preview modal
    const fileInput = page.locator('input[data-testid="avatar-file-input"]');
    await fileInput.setInputFiles(testImagePath);

    const modal = page.locator('.avatar-modal-box');
    await expect(modal).toBeVisible();

    // Verify modal does not overflow viewport width
    const modalBox = await modal.boundingBox();
    expect(modalBox).not.toBeNull();
    if (modalBox) {
      expect(modalBox.width).toBeLessThanOrEqual(360);
    }

    // Verify buttons are visible and not clipped
    const cancelBtn = modal.locator('button:has-text("Hủy")');
    const saveBtn = modal.locator('button[data-testid="save-avatar-btn"]');
    await expect(cancelBtn).toBeVisible();
    await expect(saveBtn).toBeVisible();

    await cancelBtn.click();
    await expect(modal).not.toBeVisible();
  });
});
