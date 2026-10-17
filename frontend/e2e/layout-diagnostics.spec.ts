import { test, expect } from '@playwright/test';

test.describe('Layout Diagnostics & Visual Verification', () => {
  test('inspect profile page layout and measure bounding boxes', async ({ page }) => {
    // Setup mock user in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-admin-token');
      localStorage.setItem(
        'ats:permissions',
        JSON.stringify([
          'CATALOG_READ',
          'USER_READ',
          'USER_MANAGE',
          'AUDIT_READ',
          'JOB_POSTING_MANAGE',
          'REQUISITION_READ',
        ])
      );
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 3,
          email: 'hr.manager@company.com',
          fullName: 'Trưởng phòng Nhân sự',
          displayName: 'trưởng phòng nhân sự',
          department: 'Phòng Tuyển dụng & Thu hút Nhân tài',
          roles: ['HR_MANAGER'],
          role: 'HR_MANAGER',
          status: 'ACTIVE',
        })
      );
    });

    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    const appSidebar = page.locator('.app-sidebar');
    const appContent = page.locator('.app-content');
    const profileContainer = page.locator('.profile-page-clean-container');
    const profileSummary = page.locator('.profile-summary-header');
    const personalInfoCard = page.locator('.profile-personal-info-card');

    await expect(profileContainer).toBeVisible();
    await expect(appSidebar).toBeVisible();
    await expect(appContent).toBeVisible();
    await expect(profileSummary).toBeVisible();
    await expect(personalInfoCard).toBeVisible();

    const diagnostics = await page.evaluate(() => {
      const getBox = (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          selector: sel,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          margin: style.margin,
          padding: style.padding,
          transform: style.transform,
          position: style.position,
          display: style.display,
        };
      };

      const inputs = Array.from(document.querySelectorAll('input')).map((inp) => {
        const rect = inp.getBoundingClientRect();
        return {
          id: inp.id,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          visible: rect.width > 0 && rect.x >= 0,
        };
      });

      return {
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        bodyScrollWidth: document.body.scrollWidth,
        docScrollWidth: document.documentElement.scrollWidth,
        sidebar: getBox('.app-sidebar'),
        content: getBox('.app-content'),
        profileContainer: getBox('.profile-page-clean-container'),
        summary: getBox('.profile-summary-header'),
        card: getBox('.profile-personal-info-card'),
        inputs,
      };
    });

    console.log('DIAGNOSTICS_RESULT:' + JSON.stringify(diagnostics, null, 2));

    await page.screenshot({ path: `../diagnostics_${page.viewportSize()?.width || 0}.png` });
  });
});
