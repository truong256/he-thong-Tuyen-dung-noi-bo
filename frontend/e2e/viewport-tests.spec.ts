import { test, expect } from '@playwright/test';

test.describe('Test 1024px and intermediate viewports', () => {
  const widths = [1280, 1152, 1024, 960, 900, 850, 768, 640, 480, 390, 360];

  for (const w of widths) {
    test(`viewport ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 800 });
      await page.addInitScript(() => {
        localStorage.setItem('accessToken', 'mock-admin-token');
        localStorage.setItem(
          'ats:permissions',
          JSON.stringify(['CATALOG_READ', 'USER_READ', 'USER_MANAGE', 'AUDIT_READ'])
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

      const info = await page.evaluate(() => {
        const sidebar = document.querySelector('.app-sidebar');
        const content = document.querySelector('.app-content');
        const container = document.querySelector('.profile-page-clean-container');
        const card = document.querySelector('.profile-personal-info-card');
        const sRect = sidebar ? sidebar.getBoundingClientRect() : null;
        const cRect = content ? content.getBoundingClientRect() : null;
        const pRect = container ? container.getBoundingClientRect() : null;
        const cardRect = card ? card.getBoundingClientRect() : null;

        return {
          windowWidth: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
          sidebar: sRect ? { x: sRect.x, width: sRect.width, pos: window.getComputedStyle(sidebar!).position } : null,
          content: cRect ? { x: cRect.x, width: cRect.width, scrollWidth: content!.scrollWidth } : null,
          container: pRect ? { x: pRect.x, width: pRect.width } : null,
          card: cardRect ? { x: cardRect.x, width: cardRect.width } : null,
        };
      });

      console.log(`VIEWPORT_${w}:`, JSON.stringify(info));
      expect(info.hasHorizontalOverflow).toBe(false);
      await page.screenshot({ path: `../vp_${w}.png` });
    });
  }
});
