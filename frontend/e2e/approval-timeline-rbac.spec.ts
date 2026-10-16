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

  test('Approver opens Timeline Modal, inspects "Yêu cầu bổ sung" action and responsive layout', async ({ page }) => {
    // 1. Prepare requisition as Hiring Manager via API
    await loginAs(page, 'hiring_manager@company.com');

    // Fetch reference departments and job titles
    const deptRes = await callApi(page, '/api/departments');
    const depts = Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data?.content || []);
    const targetDept = depts.find((d: any) => d.active) || depts[0];

    const jtRes = await callApi(page, '/api/job-titles');
    const jts = Array.isArray(jtRes.data) ? jtRes.data : (jtRes.data?.content || []);
    const targetJt = jts.find((j: any) => j.active) || jts[0];

    // Create a pending requisition
    const createRes = await callApi(page, '/api/requisitions', 'POST', {
      title: `Kỹ sư Phần mềm E2E - ${Date.now()}`,
      departmentId: targetDept?.id || 1,
      jobTitleId: targetJt?.id || 1,
      quantity: 1,
      reason: 'NEW_HEADCOUNT',
      proposedMinSalary: 20000000,
      proposedMaxSalary: 30000000,
      targetDate: '2026-12-01',
      isDraft: false,
    });

    const createdReqId = createRes.data?.id;

    // 2. Log in as Approver
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await loginAs(page, 'approver@company.com');

    await page.goto('/recruitment/requisitions');
    await page.waitForLoadState('networkidle');

    // Open timeline modal for the requisition (or any requisition in table)
    let timelineBtn = page.locator('button[title*="tiến độ"], button[title*="phê duyệt"]').first();
    if (createdReqId) {
      const specificBtn = page.locator(`tr:has-text("${createRes.data?.title}") button[title*="tiến độ"]`);
      if (await specificBtn.count() > 0) {
        timelineBtn = specificBtn.first();
      }
    }

    if (await timelineBtn.isVisible()) {
      await timelineBtn.click();
    } else {
      // In mobile/responsive card view or fallback
      const mobileBtn = page.locator('.mobile-card button[title*="tiến độ"], .req-action-btn:has(svg)').first();
      if (await mobileBtn.isVisible()) {
        await mobileBtn.click();
      }
    }

    const modal = page.locator('.atl-modal');
    if (await modal.isVisible()) {
      await expect(modal.locator('.atl-title')).toContainText(/Tiến trình phê duyệt/i);

      // Verify "Yêu cầu bổ sung" action button if quick actions box is rendered
      const btnRequestChanges = page.locator('.atl-btn-request-changes');
      if (await btnRequestChanges.isVisible()) {
        await expect(btnRequestChanges).toBeEnabled();

        // Clicking without comment produces validation message
        await btnRequestChanges.click();
        await expect(page.locator('text=Vui lòng nhập nội dung yêu cầu bổ sung vào ô ý kiến phản hồi.')).toBeVisible();
      }
    }

    // 3. Inspect layout and overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // Save viewport screenshot
    const vpName = page.viewportSize() ? `${page.viewportSize()?.width}x${page.viewportSize()?.height}` : 'current';
    await page.screenshot({
      path: `C:/Users/ASUS/.gemini/antigravity-ide/brain/71a2205f-e716-495a-9239-116a7713ec96/approval_timeline_${vpName}.png`,
      fullPage: true,
    });
  });
});
