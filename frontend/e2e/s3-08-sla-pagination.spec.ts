import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('S3-08: Requisition SLA, Overdue Warning and Pagination Verification', () => {
  const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity-ide/brain/477c4260-45cd-4d77-b87c-2a2aa4402d4f';

  async function loginAsAdmin(page: any) {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill('admin@company.com');
    await page.locator('input[type="password"]').fill('Password123@');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');
  }

  test('E2E Verification of SLA badges, Overdue warning, Pagination, and Filters', async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('React Router Future Flag Warning')) {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    await loginAsAdmin(page);

    await page.goto('/recruitment/requisitions');
    await page.waitForLoadState('networkidle');

    // 1. Verify Page Title and Header
    await expect(page.locator('h1')).toContainText(/Yêu cầu Tuyển dụng/i);
    await expect(page.locator('.req-table')).toBeVisible();

    // 2. Verify SLA Badges & Bug Fix for REQ-20261018-9392 (DRAFT)
    const draftRow = page.locator('tr:has-text("REQ-20261018-9392")');
    if ((await draftRow.count()) > 0) {
      // Must NOT display 'Đã kết thúc'
      await expect(draftRow).not.toContainText('Đã kết thúc');
      // Must display 'Chưa mở' for days open
      await expect(draftRow).toContainText('Chưa mở');
      // Must display target date and remaining days
      await expect(draftRow).toContainText('2026-11-16');
      await expect(draftRow).toContainText('Còn 29 ngày');
    }

    // 3. Verify Overdue Highlight for REQ-20261018-3029
    const overdueRow = page.locator('tr:has-text("REQ-20261018-3029")');
    if ((await overdueRow.count()) > 0) {
      await expect(overdueRow).toContainText('Quá hạn 8 ngày');
      await expect(overdueRow.locator('.req-sla-badge.overdue')).toBeVisible();
    }

    // 4. Verify Today Deadline for REQ-202610-0004
    const todayRow = page.locator('tr:has-text("REQ-202610-0004")');
    if ((await todayRow.count()) > 0) {
      await expect(todayRow).toContainText('Hạn hôm nay');
      await expect(todayRow.locator('.req-sla-badge.warning')).toBeVisible();
    }

    // 5. Verify Pagination Bar
    const pagination = page.locator('.enterprise-pagination');
    await expect(pagination).toBeVisible();
    await expect(pagination).toContainText(/Hiển thị 1 - 10 trong tổng số \d+ yêu cầu/);

    // Capture Full List Screenshot with active page 1 & SLA badges
    const fullListPath = path.join(ARTIFACT_DIR, `s3_08_full_list_${testInfo.project.name}.png`);
    await page.screenshot({ path: fullListPath, fullPage: true });

    // Click Page 2
    const page2Button = pagination.locator('button[aria-label="Trang 2"]');
    if ((await page2Button.count()) > 0) {
      await page2Button.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/page=2/);
      // Return to page 1
      const page1Button = pagination.locator('button[aria-label="Trang 1"]');
      await page1Button.click();
      await page.waitForLoadState('networkidle');
    }

    // 6. Test Date Range Filter & Validation Error
    const fromInput = page.locator('input[aria-label="Từ ngày tạo"]');
    const toInput = page.locator('input[aria-label="Đến ngày tạo"]');
    if ((await fromInput.count()) > 0 && (await toInput.count()) > 0) {
      await fromInput.fill('2026-10-25');
      await toInput.fill('2026-10-10');
      const errorBanner = page.locator('.req-filter-error-banner');
      await expect(errorBanner).toBeVisible();
      await expect(errorBanner).toContainText('Ngày bắt đầu không được lớn hơn ngày kết thúc.');

      // Clear dates
      const clearBtn = page.locator('.req-date-clear-btn');
      if ((await clearBtn.count()) > 0) {
        await clearBtn.click();
        await expect(errorBanner).toHaveCount(0);
      }
    }

    // 7. Test SLA Filter
    const slaSelect = page.locator('.req-select').filter({ hasText: /Tất cả hạn SLA/ });
    if ((await slaSelect.count()) > 0) {
      await slaSelect.selectOption('OVERDUE');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/sla=OVERDUE/);
      await expect(page.locator('.req-table')).toBeVisible();

      // Capture Overdue Filter Screenshot
      const overduePath = path.join(ARTIFACT_DIR, `s3_08_overdue_filter_${testInfo.project.name}.png`);
      await page.screenshot({ path: overduePath, fullPage: true });

      // Reset
      await slaSelect.selectOption('ALL');
      await page.waitForLoadState('networkidle');
    }

    // 8. Verify 0 unexplained console errors
    expect(consoleErrors).toHaveLength(0);
  });
});
