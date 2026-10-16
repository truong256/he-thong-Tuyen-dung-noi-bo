import { test, expect } from '@playwright/test';

test.describe('S3-02 / S3-03 Approval Timeline & RBAC Actions E2E Verification', () => {

  async function loginAs(page: any, email: string, password = 'Password123@') {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');
  }

  async function callApi(page: any, path: string, method = 'GET', body: any = null) {
    return await page.evaluate(async ({ path, method, body }) => {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => null);
      return { status: res.status, data };
    }, { path, method, body });
  }

  test('Recruiter can see and navigate to Requisition Management from sidebar', async ({ page }) => {
    await loginAs(page, 'recruiter@company.com');

    const viewport = page.viewportSize();
    const isDesktop = (viewport?.width ?? 1280) >= 1024;

    if (!isDesktop) {
      const menuToggle = page.locator('button.mobile-menu-btn, button[aria-label="Mở menu"], .mobile-menu-toggle');
      if (await menuToggle.isVisible()) {
        await menuToggle.click();
        await page.waitForTimeout(300);
      }
    }

    const reqLink = page.locator('.app-sidebar a[href="/recruitment/requisitions"]');
    await expect(reqLink).toBeVisible();
    await reqLink.click();

    await page.waitForURL('**/recruitment/requisitions');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText(/Yêu cầu Tuyển dụng/i);
  });

  test('Approver opens Timeline Modal, inspects all 3 approval buttons and responsive layout', async ({ page }) => {
    // 1. Configure S3-01 approval workflow as HR Manager with approver@company.com (id 6) at Step 1
    await loginAs(page, 'hr_manager@company.com');

    const deptRes = await callApi(page, '/api/departments');
    const depts = Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data?.content || []);
    // Find department for Backend where hiring_manager belongs
    const targetDept = depts.find((d: any) => d.name?.includes('Backend')) || depts.find((d: any) => d.active) || depts[0];

    const jtRes = await callApi(page, '/api/job-titles');
    const jts = Array.isArray(jtRes.data) ? jtRes.data : (jtRes.data?.content || []);
    const targetJt = jts.find((j: any) => j.active) || jts[0];

    console.log('--- targetDept:', targetDept?.id, targetDept?.name);
    console.log('--- targetJt:', targetJt?.id, targetJt?.title);

    // Get approver user
    const usersRes = await callApi(page, '/api/admin/users?role=APPROVER');
    const approverUser = usersRes.data?.content?.find((u: any) => u.email === 'approver@company.com') || { id: 6 };
    console.log('--- approverUser:', approverUser.id, approverUser.email);

    // Ensure 1-step workflow exists for targetDept with approver@company.com
    const cfgListRes = await callApi(page, `/api/requisition-approval-configurations?departmentId=${targetDept.id}`);
    const existingCfgs = Array.isArray(cfgListRes.data) ? cfgListRes.data : [];
    const activeCfg = existingCfgs.find((c: any) => c.active);
    if (activeCfg) {
      const updateRes = await callApi(page, `/api/requisition-approval-configurations/${activeCfg.id}`, 'PUT', {
        departmentId: targetDept.id,
        steps: [
          { minimumSalary: 0, approverUserId: approverUser.id },
        ],
      });
      console.log('--- updated existing approval configuration:', updateRes.status);
    } else {
      const createCfgRes = await callApi(page, '/api/requisition-approval-configurations', 'POST', {
        departmentId: targetDept.id,
        steps: [
          { minimumSalary: 0, approverUserId: approverUser.id },
        ],
      });
      console.log('--- created approval configuration:', createCfgRes.status);
    }

    // 2. Prepare requisition as Hiring Manager via API
    await page.evaluate(() => localStorage.clear());
    await loginAs(page, 'hiring_manager@company.com');

    const testReqTitle = `Kỹ sư Backend S3-02 - ${Date.now()}`;
    const createRes = await callApi(page, '/api/requisitions', 'POST', {
      title: testReqTitle,
      departmentId: targetDept?.id,
      jobTitleId: targetJt?.id,
      quantity: 1,
      reason: 'NEW_HEADCOUNT',
      proposedMinSalary: 40000000,
      proposedMaxSalary: 50000000,
      salaryExplanation: 'Khung lương chuẩn cho vị trí Senior Backend Engineer',
      targetDate: '2026-12-01',
      isDraft: false,
    });
    console.log('--- createRes:', createRes.status, createRes.data?.id, createRes.data?.requisitionCode);
    expect(createRes.status).toBe(201);

    const createdReqCode = createRes.data?.requisitionCode;

    // 3. Log in as Approver - designated approver at Step 1
    await page.evaluate(() => localStorage.clear());
    await loginAs(page, 'approver@company.com');

    await page.goto('/recruitment/requisitions');
    await page.waitForLoadState('networkidle');

    // Wait for the table body to render
    await page.waitForSelector('table.req-table tbody tr', { timeout: 15000 });

    const targetRow = page.locator(`table.req-table tbody tr:has-text("${createdReqCode}")`);
    await expect(targetRow).toBeVisible();

    const timelineBtn = targetRow.locator('button[title*="tiến độ"]');
    await timelineBtn.waitFor({ state: 'visible', timeout: 5000 });
    await timelineBtn.click();

    const modal = page.locator('.approval-timeline-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.atl-header-title, #atl-modal-title')).toContainText(/Theo dõi tiến độ & Lịch sử phê duyệt/i);

    // Verify all 3 approval buttons for designated approver at current pending step
    const actionBox = modal.locator('.atl-action-box');
    await expect(actionBox).toBeVisible();

    const btnApprove = actionBox.locator('.atl-btn-approve');
    const btnReject = actionBox.locator('.atl-btn-reject');
    const btnRequestChanges = actionBox.locator('.atl-btn-request-changes');

    await expect(btnApprove).toBeVisible();
    await expect(btnReject).toBeVisible();
    await expect(btnRequestChanges).toBeVisible();

    // Clicking "Yêu cầu bổ sung" without comment produces validation message
    await btnRequestChanges.click();
    await expect(page.locator('text=Vui lòng nhập nội dung yêu cầu bổ sung vào ô ý kiến phản hồi.')).toBeVisible();

    // 4. Inspect layout and overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // Save viewport screenshot showing the modal with the 3 approval buttons
    const vpName = page.viewportSize() ? `${page.viewportSize()?.width}x${page.viewportSize()?.height}` : 'current';
    await page.screenshot({
      path: `C:/Users/ASUS/.gemini/antigravity-ide/brain/71a2205f-e716-495a-9239-116a7713ec96/approval_timeline_${vpName}.png`,
      fullPage: true,
    });
  });
});
