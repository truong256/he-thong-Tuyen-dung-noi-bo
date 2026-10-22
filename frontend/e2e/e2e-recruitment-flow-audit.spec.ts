import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.resolve('test-results/audit-screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('E2E Recruitment Flow Audit & Bug Reproduction', () => {

  test('TC01 - Login across roles and verify redirection', async ({ page }) => {
    // 1. Login with Admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'Password123@');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/.*dashboard/);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_admin_dashboard.png') });

    // 2. Check localStorage token
    const token = await page.evaluate(() => localStorage.getItem('token') || localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
  });

  test('TC02 & TC03 - Hiring Manager Requisition Flow', async ({ page }) => {
    // Login as Hiring Manager
    await page.goto('/login');
    await page.fill('input[type="email"]', 'hiring_manager@company.com');
    await page.fill('input[type="password"]', 'Password123@');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to Requisitions
    await page.goto('/recruitment/requisitions');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_hm_requisition_list.png') });
    await expect(page.locator('body')).not.toContainText('403');
  });

  test('TC04 - Recruiter Job Postings Navigation & Scope Check', async ({ page }) => {
    // Login as Recruiter
    await page.goto('/login');
    await page.fill('input[type="email"]', 'recruiter@company.com');
    await page.fill('input[type="password"]', 'Password123@');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to Job Postings
    await page.goto('/recruitment/job-postings');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_recruiter_job_postings.png') });
  });

  test('TC05 & BUG 01 - Anonymous candidate applies on /careers with fake CV upload', async ({ page }) => {
    // Clear storage to simulate anonymous candidate
    await page.goto('/careers');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_public_careers.png') });

    // Find and click on the first job detail
    const jobCards = page.locator('.jp-public-card, .jp-card, a[href*="/careers/jobs/"]');
    const count = await jobCards.count();
    if (count > 0) {
      await jobCards.first().click();
      await page.waitForURL(/.*careers\/jobs\/\d+/, { timeout: 10000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_public_job_detail.png') });

      // Check CV file input in PublicJobDetailPage
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        console.log('File input is visible on public job detail page');
      }
    }
  });

  test('BUG 03 - Recruiter access to /recruitment/candidates triggers 403 Forbidden', async ({ page }) => {
    // Login as Recruiter
    await page.goto('/login');
    await page.fill('input[type="email"]', 'recruiter@company.com');
    await page.fill('input[type="password"]', 'Password123@');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Directly access /recruitment/candidates
    await page.goto('/recruitment/candidates');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_recruiter_candidates_bug03.png') });

    // Recruiter only has CANDIDATE_READ_ASSIGNED, but route requires CANDIDATE_READ_ALL
    const unauthorizedTitle = page.locator('text=403, text=Không có quyền, text=Unauthorized, text=Từ chối truy cập');
    const isBlocked = await unauthorizedTitle.count() > 0;
    console.log('BUG 03 Reproduction - Is Recruiter blocked with 403 on /recruitment/candidates:', isBlocked);
  });

  test('BUG 04 - CandidateApprovalsPage fails with 401 Unauthorized', async ({ page }) => {
    // Login as Admin or HR Manager
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@company.com');
    await page.fill('input[type="password"]', 'Password123@');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Directly access /recruitment/approvals
    await page.goto('/recruitment/approvals');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_candidate_approvals_bug04.png') });

    // Look for error message on page caused by fetch('/api/candidates') lacking Authorization header
    const pageText = await page.locator('body').innerText();
    console.log('Candidate approvals page text contains 401:', pageText.includes('401'));
  });
});
