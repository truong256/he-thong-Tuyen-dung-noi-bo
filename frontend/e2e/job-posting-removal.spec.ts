import { test, expect } from '@playwright/test';

const recruiter = { id: 187, email: 'recruiter@test.local', fullName: 'Nhân viên tuyển dụng',
  role: 'RECRUITER', roles: ['RECRUITER'], status: 'ACTIVE', mustChangePassword: false };
const initial = { id: 187, jobCode: 'JP-2026-0187', title: 'Chuyên viên phát triển hệ thống tuyển dụng nội bộ và quản lý hồ sơ ứng viên',
  departmentName: 'Phòng Công nghệ và phát triển sản phẩm', workingModel: 'HYBRID', quantity: 2,
  salaryVisible: false, status: 'PUBLISHED', applicationDeadline: '2099-12-31',
  workLocation: 'Thành phố Hồ Chí Minh', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', auditLogs: [] };

test('recruiter confirms removal, sees expired state, and handles API failure', async ({ page }, info) => {
  let posting = { ...initial };
  let fail = false;
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(user => {
    localStorage.setItem('accessToken', 'contract-test-token'); localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('ats:last_activity_time', String(Date.now()));
  }, recruiter);
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith('/api/')) return route.continue();
    if (path === '/api/auth/me') return route.fulfill({ json: recruiter });
    if (path === '/api/auth/permissions') return route.fulfill({ json: ['JOB_MANAGE', 'PROFILE_READ'] });
    if (path === '/api/organization/departments') return route.fulfill({ json: [] });
    if (path.endsWith('/unpublish')) {
      expect(route.request().postDataJSON().reason).toBe('Đã tuyển đủ nhân sự theo kế hoạch');
      if (fail) return route.fulfill({ status: 409, json: { message: 'Tin đã thay đổi, vui lòng tải lại.' } });
      posting = { ...posting, status: 'UNPUBLISHED' }; return route.fulfill({ json: posting });
    }
    if (path === '/api/job-postings/187') return route.fulfill({ json: posting });
    if (path.endsWith('/audit-logs')) return route.fulfill({ json: [] });
    if (path === '/api/job-postings') return route.fulfill({ json: { content: [posting], totalElements: 1, totalPages: 1, number: 0, size: 10 } });
    return route.fulfill({ json: [] });
  });
  // Unrelated CDN assets are isolated; the app already bundles its Vietnamese font locally.
  await page.route(/^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)\//, route => route.fulfill({ body: '', contentType: route.request().url().includes('.js') ? 'text/javascript' : 'text/css' }));
  await page.goto('/recruitment/job-postings');
  await expect(page.getByRole('heading', { name: 'Quản lý & Duyệt tin tuyển dụng' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gỡ tin JP-2026-0187', exact: true })).toBeAttached();
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('list.png'), fullPage: true });
  await page.getByRole('button', { name: 'Gỡ tin JP-2026-0187', exact: true }).click();
  const confirm = page.getByRole('button', { name: 'Xác nhận Gỡ tin', exact: true });
  await expect(confirm).toBeDisabled();
  await page.getByLabel('Lý do gỡ tin (bắt buộc)').fill('Đã tuyển đủ nhân sự theo kế hoạch');
  await expect(confirm).toBeEnabled();
  const box = await confirm.boundingBox();
  expect(box && box.y >= 0 && box.y + box.height <= (page.viewportSize()?.height ?? 0)).toBe(true);
  await page.screenshot({ path: info.outputPath('confirmation.png'), fullPage: true });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await confirm.click();
  await expect(page.getByText('Đã gỡ tin tuyển dụng khỏi cổng công khai thành công.')).toBeVisible();
  await page.getByRole('button', { name: 'Đóng', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Gỡ tin JP-2026-0187', exact: true })).toHaveCount(0);
  posting = { ...posting, status: 'EXPIRED' };
  await page.getByTitle('Tải lại danh sách').click();
  await expect(page.getByText('Hết hạn (tự động)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gỡ tin JP-2026-0187', exact: true }).click();
  await expect(page.getByText('Đã hết hạn nhận hồ sơ', { exact: true })).toBeVisible();
  await page.getByLabel('Lý do gỡ tin (bắt buộc)').fill('Đã tuyển đủ nhân sự theo kế hoạch');
  fail = true; await confirm.click();
  await expect(page.getByText('Tin đã thay đổi, vui lòng tải lại.')).toBeVisible();
  await expect(confirm).toBeEnabled();
  await page.screenshot({ path: info.outputPath('expired-error.png'), fullPage: true });
  expect(errors).toEqual([]);
});
