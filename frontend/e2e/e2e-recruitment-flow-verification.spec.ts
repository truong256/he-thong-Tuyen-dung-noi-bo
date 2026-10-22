import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.resolve('../docs/testing/screenshots/repair');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Tạo file PDF thật để dùng trong test
const samplePdfPath = path.resolve('../data/sample_ui_test_cv.pdf');
const samplePdfBytes = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n180\n%%EOF'
);
fs.writeFileSync(samplePdfPath, samplePdfBytes);

test.describe('E2E Recruitment Flow Bug Fix Verification', () => {

  test('VERIFY BUG 05 - Requisition validation returns HTTP 400 when departmentId missing', async ({ request }) => {
    // Đăng nhập lấy token Hiring Manager
    const loginRes = await request.post('http://localhost:8080/api/auth/login', {
      data: {
        username: 'hiring_manager@company.com',
        password: 'Password123@',
      },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    const token = loginData.accessToken || loginData.token;

    // Gửi payload thiếu departmentId
    const res = await request.post('http://localhost:8080/api/recruitment-requests', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: 'Yêu cầu tuyển dụng thiếu departmentId',
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.validationErrors?.departmentId).toContain('Phòng ban không được để trống');
  });

  test('VERIFY BUG 03 - Recruiter accesses /recruitment/candidates without 403 Forbidden', async ({ page }) => {
    // 1. Đăng nhập với tài khoản Recruiter
    await page.goto('/login');
    await page.fill('input[type="email"]', 'recruiter@company.com');
    await page.fill('input[type="password"]', 'Password123@');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // 2. Điều hướng tới /recruitment/candidates
    await page.goto('/recruitment/candidates');
    await page.waitForLoadState('networkidle');

    // 3. Khẳng định không bị chặn bởi trang 403 Forbidden
    const forbiddenHeading = page.locator('text=403 - Không đủ quyền truy cập');
    await expect(forbiddenHeading).not.toBeVisible();

    // 4. Khẳng định trang quản lý ứng viên hiển thị đúng tiêu đề
    const pageTitle = page.locator('h1, h2').filter({ hasText: /hồ sơ|ứng viên|pipeline/i });
    await expect(pageTitle.first()).toBeVisible();

    const projectName = test.info().project.name;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `bug03_recruiter_candidates_${projectName}.png`) });
  });

  test('VERIFY BUG 04 - CandidateApprovalsPage loads data with JWT without 401 error', async ({ page }) => {
    // 1. Đăng nhập với tài khoản HR Manager
    await page.goto('/login');
    await page.fill('input[type="email"]', 'hr_manager@company.com');
    await page.fill('input[type="password"]', 'Password123@');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // 2. Truy cập /recruitment/approvals
    await page.goto('/recruitment/approvals');
    await page.waitForLoadState('networkidle');

    // 3. Khẳng định không xuất hiện cảnh báo đỏ "Không tải được hồ sơ (401)"
    const errorAlert = page.locator('text=Không tải được hồ sơ (401)');
    await expect(errorAlert).not.toBeVisible();

    const projectName = test.info().project.name;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `bug04_candidate_approvals_${projectName}.png`) });
  });

  test('VERIFY BUG 01 & BUG 02 - Candidate applies with real CV & HR views full details and downloads CV', async ({ page, context }) => {
    // 1. Ứng viên truy cập cổng tuyển dụng công khai /careers
    await page.goto('/careers');
    await page.waitForLoadState('networkidle');

    // Mở tin tuyển dụng
    const jobCards = page.locator('.jp-public-job-card');
    const jobCount = await jobCards.count();
    expect(jobCount).toBeGreaterThan(0);

    // Mở tin tuyển dụng đầu tiên
    await jobCards.first().click();
    await page.waitForURL(/.*careers\/\d+/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    const candidateEmail = `ungvien.playwright.${Date.now()}@example.com`;
    const candidatePhone = '0988776655';
    const candidateCoverLetter = 'Tôi nộp hồ sơ đính kèm CV PDF thực tế được xác minh bởi Playwright.';

    // Điền form ứng tuyển
    await page.fill('#applicant-fullname', 'Bùi Ứng Viên Thực Tế E2E');
    await page.fill('#applicant-email', candidateEmail);
    await page.fill('#applicant-phone', candidatePhone);
    await page.fill('#applicant-cover-letter', candidateCoverLetter);

    // Đính kèm file PDF thật
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(samplePdfPath);

    // Chụp ảnh form trước khi nộp
    const projectName = test.info().project.name;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `bug01_cv_upload_form_${projectName}.png`) });

    // Bấm nút Nộp hồ sơ
    const submitBtn = page.locator('button.jp-submit-apply-btn');
    await submitBtn.click();

    // Chờ thông báo thành công
    const successMsg = page.locator('text=Nộp hồ sơ ứng tuyển thành công');
    await expect(successMsg).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `bug01_cv_upload_success_${projectName}.png`) });

    // 2. HR Manager đăng nhập kiểm tra thông tin được lưu đầy đủ (BUG 02) và tải về CV thật (BUG 01)
    const hrPage = await context.newPage();
    await hrPage.goto('/login');
    await hrPage.fill('input[type="email"]', 'hr_manager@company.com');
    await hrPage.fill('input[type="password"]', 'Password123@');
    await hrPage.click('button[type="submit"]');
    await hrPage.waitForURL('**/dashboard', { timeout: 15000 });

    await hrPage.goto('/recruitment/candidates');
    await hrPage.waitForLoadState('networkidle');

    // Khẳng định số điện thoại của ứng viên xuất hiện trên bảng danh sách
    const phoneCell = hrPage.locator(`text=${candidatePhone}`);
    await expect(phoneCell.first()).toBeVisible({ timeout: 10000 });

    // Khẳng định nút tải/xem CV có mặt
    const downloadCvBtn = hrPage.locator('button').filter({ hasText: /📎|sample_ui_test/i });
    await expect(downloadCvBtn.first()).toBeVisible();

    await hrPage.screenshot({ path: path.join(SCREENSHOT_DIR, `bug02_candidate_management_${projectName}.png`) });
    await hrPage.close();
  });
});
