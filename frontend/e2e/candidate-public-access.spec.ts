import { test, expect, Page } from '@playwright/test';

// UI contract tests. Backend visibility and JWT/RBAC are independently exercised
// against the real service/repository in PublicJobPostingIntegrationTest.
const candidate = { id: 91, email: 'candidate@company.com', fullName: 'Ứng viên kiểm thử',
  roles: ['CANDIDATE'], role: 'CANDIDATE', status: 'ACTIVE', mustChangePassword: false };
const job = { id: 1, jobCode: 'JP-2026-0001', title: 'Kỹ sư phần mềm phát triển hệ thống tuyển dụng nội bộ',
  departmentId: 5, departmentName: 'Phòng Công nghệ và Phát triển sản phẩm', workingModel: 'REMOTE',
  workLocation: 'Thành phố Hồ Chí Minh', quantity: 2, salaryDisplay: 'Thỏa thuận', salaryVisible: false,
  applicationDeadline: '2099-12-31', jobDescription: 'Phát triển phần mềm phục vụ quy trình tuyển dụng nội bộ.',
  requirements: 'Kinh nghiệm Java và TypeScript.', benefits: 'Môi trường làm việc linh hoạt.' };

async function mockApi(page: Page) {
  const internalRequests: string[] = [];
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: candidate });
    if (path === '/api/auth/permissions') return route.fulfill({ json: ['PROFILE_READ', 'PROFILE_UPDATE', 'CANDIDATE_APPLY'] });
    if (path === '/api/public/job-postings/departments') return route.fulfill({ json: [{ id: 5, name: job.departmentName }] });
    if (path === '/api/public/job-postings') return route.fulfill({ json: {
      content: [job], totalElements: 1, totalPages: 1, number: 0, size: 30,
    } });
    if (path === '/api/public/job-postings/1') return route.fulfill({ json: job });
    if (path === '/api/public/job-postings/999') return route.fulfill({ status: 404, json: { message: 'Tin không khả dụng.' } });
    internalRequests.push(path);
    return route.fulfill({ status: 403, json: { message: 'Forbidden' } });
  });
  return internalRequests;
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test('guest opens public list and detail without login or internal API calls', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const internal = await mockApi(page);
  await page.goto('/careers');
  await expect(page.getByRole('heading', { name: 'Các vị trí đang mở tuyển (1)' })).toBeVisible();
  await expect(page.getByRole('option', { name: job.departmentName })).toBeAttached();
  await expectNoOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('public-list.png'), fullPage: true });
  await page.getByRole('heading', { name: job.title }).click();
  await expect(page).toHaveURL(/\/careers\/1$/);
  await expect(page.getByRole('heading', { name: job.title })).toBeVisible();
  await expect(page.getByText('JP-2026-0001', { exact: true })).toBeVisible();
  await expectNoOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('public-detail.png'), fullPage: true });
  expect(internal).toEqual([]);
  expect(errors).toEqual([]);
});

test('candidate dashboard count, careers navigation and management guard', async ({ page }, testInfo) => {
  const internal = await mockApi(page);
  await page.addInitScript(user => {
    localStorage.setItem('accessToken', 'ui-contract-test-token');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('ats:last_activity_time', String(Date.now()));
  }, candidate);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Khám phá Vị trí Nghề nghiệp (1)' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Việc làm đang mở' })).toHaveAttribute('href', '/careers');
  await expectNoOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('candidate-dashboard.png'), fullPage: true });
  await page.getByRole('button', { name: 'Khám phá vị trí', exact: true }).click();
  await expect(page).toHaveURL(/\/careers$/);
  await expect(page.getByRole('heading', { name: job.title })).toBeVisible();
  await page.goto('/recruitment/job-postings');
  await expect(page.getByText('403', { exact: true })).toBeVisible();
  expect(internal).toEqual([]);
});

test('unavailable public detail does not redirect guests to login', async ({ page }) => {
  await mockApi(page);
  await page.goto('/careers/999');
  await expect(page.getByRole('heading', { name: 'Tin tuyển dụng không khả dụng' })).toBeVisible();
  await expect(page).toHaveURL(/\/careers\/999$/);
});
