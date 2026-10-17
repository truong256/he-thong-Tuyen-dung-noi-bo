import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const fixturePath = process.env.S306_E2E_FIXTURE_FILE;
// The dedicated config fails without fixtures; the general E2E suite remains usable.
const fixture = fixturePath ? JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as {
  managerEmail: string; password: string; sourceId: number; sourceCode: string;
  recruiters: { id: number; email: string; name: string }[];
} : null;
test.skip(!fixture, 'Run with the dedicated config and generated S306_E2E_FIXTURE_FILE.');

test('S3-05/S3-06 real login, clone, assignment, handover and refresh', async ({ page }, testInfo) => {
  if (!fixture) throw new Error('S306_E2E_FIXTURE_FILE is required.');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/login');
  await page.locator('input[type=email]').fill(fixture.managerEmail);
  await page.locator('input[type=password]').fill(fixture.password);
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto('/recruitment/requisitions');
  const source = page.getByRole('row').filter({ hasText: fixture.sourceCode });
  await expect(source).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem('accessToken'));
  const auth = { Authorization: `Bearer ${token}` };

  // Clone through the rendered UI and inspect the real HTTP response.
  const responsePromise = page.waitForResponse(r => r.url().endsWith(`/api/recruitment-requests/${fixture.sourceId}/clone`) && r.request().method() === 'POST');
  await source.getByTitle('Sao chép yêu cầu tuyển dụng', { exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const copy = await response.json();
  expect(copy.id).not.toBe(fixture.sourceId);
  expect(copy.status).toBe('DRAFT');
  const editor = page.locator('.req-modal-content');
  await expect(editor).toBeVisible();
  await expect(editor.locator('input[placeholder="Ví dụ: Tuyển dụng Senior Java Developer"]')).toHaveValue('Yêu cầu kiểm thử sao chép và phân công');
  await expect(editor.locator('textarea').nth(1)).toHaveValue('Mô tả công việc dùng cho regression S3-05');
  await page.screenshot({ path: testInfo.outputPath('clone.png'), fullPage: true });
  await editor.locator('.req-modal-header button').click();

  // Establish known assignments for each viewport run without mocking any API.
  const initial = await page.request.put(`/api/requisitions/${fixture.sourceId}/assignments`, {
    headers: auth, data: { primaryRecruiterId: fixture.recruiters[0].id, supportRecruiterIds: fixture.recruiters.slice(1).map(r => r.id), reason: 'Browser test setup' },
  });
  expect(initial.ok()).toBeTruthy();
  await page.reload();
  await source.getByTitle('Phân công Recruiter phụ trách', { exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Phân công Recruiter phụ trách' });
  await expect(dialog).toBeVisible();
  const newPrimaryRow = dialog.getByRole('row').filter({ hasText: fixture.recruiters[1].email });
  await newPrimaryRow.getByRole('radio').check();
  await expect(newPrimaryRow.getByRole('checkbox')).toBeDisabled();
  const oldPrimaryRow = dialog.getByRole('row').filter({ hasText: fixture.recruiters[0].email });
  await oldPrimaryRow.getByRole('checkbox').check();
  await dialog.getByPlaceholder(/Bắt buộc: Nhập lý do/).fill('Bàn giao kiểm thử trình duyệt');
  await page.screenshot({ path: testInfo.outputPath('assignment.png'), fullPage: true });
  const saved = page.waitForResponse(r => r.url().endsWith(`/api/requisitions/${fixture.sourceId}/assignments`) && r.request().method() === 'PUT');
  await dialog.getByRole('button', { name: /Lưu phân công/ }).click();
  expect((await saved).status()).toBe(200);
  await expect(dialog).toBeHidden();
  await page.reload();
  await source.getByTitle('Phân công Recruiter phụ trách', { exact: true }).click();
  await expect(dialog.getByRole('row').filter({ hasText: fixture.recruiters[1].email }).getByRole('radio')).toBeChecked();
  await dialog.getByRole('button', { name: /Lịch sử/ }).click();
  await expect(dialog.getByText('Bàn giao kiểm thử trình duyệt').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('history.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
  // Remove only the draft made by this test; the entire fixture DB is in-memory.
  const cleaned = await page.request.delete(`/api/requisitions/${copy.id}`, { headers: auth });
  expect(cleaned.ok()).toBeTruthy();
});
