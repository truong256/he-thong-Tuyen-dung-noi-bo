import { test, expect } from '@playwright/test';

test.describe('Dashboard and User Management Polish Verification', () => {
  test('verify Dashboard and Users page on current viewport', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const viewport = page.viewportSize();
    const width = viewport?.width ?? 1280;
    const height = viewport?.height ?? 800;

    // 1. Login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill('admin@company.com');
    await page.locator('input[type="password"]').fill('Password123@');
    await page.locator('button[type="submit"]').click();

    // 2. Wait for Dashboard
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify computed font-family on body is Be Vietnam Pro
    const computedFontFamily = await page.evaluate(() => {
      return window.getComputedStyle(document.body).fontFamily;
    });
    expect(computedFontFamily.toLowerCase()).toContain('be vietnam pro');

    // Verify welcome heading does NOT contain emoji 👋
    const welcomeHeading = page.locator('.welcome-text h1');
    await expect(welcomeHeading).toBeVisible();
    const headingText = await welcomeHeading.innerText();
    expect(headingText).toMatch(/Xin chào, (admin|Quản trị viên)/);
    expect(headingText).not.toContain('👋');

    // Verify role display on welcome banner is localized to 'Quản trị viên' (NOT 'ADMIN')
    const roleBadge = page.locator('.welcome-role-tag .badge.role');
    await expect(roleBadge).toBeVisible();
    const roleBadgeText = await roleBadge.innerText();
    expect(roleBadgeText).toBe('Quản trị viên');

    // Verify admin section heading is 'Bảng điều khiển Quản trị viên' (NO '(Admin)')
    const adminHeading = page.locator('.role-dashboard.admin-view .section-title');
    await expect(adminHeading).toBeVisible();
    const adminHeadingText = await adminHeading.innerText();
    expect(adminHeadingText).toContain('Bảng điều khiển Quản trị viên');
    expect(adminHeadingText).not.toContain('(Admin)');

    // Verify sidebar link text is 'Quản lý Tài khoản' (NO '(Admin)')
    if (width >= 1024) {
      const sidebarAdminLink = page.locator('.app-sidebar a[href="/admin/users"]');
      await expect(sidebarAdminLink).toBeVisible();
      const sidebarLinkText = await sidebarAdminLink.innerText();
      expect(sidebarLinkText).toContain('Quản lý Tài khoản');
      expect(sidebarLinkText).not.toContain('(Admin)');
    }

    // Verify stat cards
    const statCards = page.locator('.stat-card');
    await expect(statCards).toHaveCount(4);

    // Verify action cards
    const actionCards = page.locator('.dashboard-cards-grid .card');
    await expect(actionCards).toHaveCount(4);

    // Micro-interaction checks on Dashboard
    const userProfile = page.locator('.user-profile');
    await expect(userProfile).toBeVisible();
    await userProfile.hover();
    const profileCursor = await userProfile.evaluate((el) => window.getComputedStyle(el).cursor);
    expect(profileCursor).toBe('pointer');

    // Test profile dropdown toggle & micro-interaction
    await userProfile.click();
    const dropdownMenu = page.locator('.dropdown-menu');
    await expect(dropdownMenu).toBeVisible();
    const dropdownAnim = await dropdownMenu.evaluate((el) => window.getComputedStyle(el).animationName);
    expect(dropdownAnim).toBe('dropdownEnter');
    await userProfile.click(); // Close dropdown
    await expect(dropdownMenu).not.toBeVisible();

    if (width >= 1024) {
      const sidebarItem = page.locator('.sidebar-menu li a').first();
      await sidebarItem.hover();
      const sidebarTransition = await sidebarItem.evaluate((el) => window.getComputedStyle(el).transition);
      expect(sidebarTransition).toBeTruthy();
    }

    // Verify stat cards have transitions but transform is none (no false affordance)
    const firstStatCard = page.locator('.stat-card').first();
    const statCardTransform = await firstStatCard.evaluate((el) => window.getComputedStyle(el).transform);
    expect(statCardTransform).toBe('none');

    // Verify no horizontal overflow on dashboard
    const dashboardOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(dashboardOverflow).toBeFalsy();

    // Take screenshot of dashboard
    await page.screenshot({
      path: `../dashboard_polish_${width}x${height}.png`,
      fullPage: false,
    });

    // 3. Navigate to User Management
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Verify page header
    const pageHeader = page.locator('.page-header h2');
    await expect(pageHeader).toBeVisible();
    await expect(pageHeader).toContainText('Quản lý Tài khoản & Phân quyền');

    // Verify role filter options have localized text while keeping internal code values
    const roleSelectOptions = await page.locator('#role-filter option').allInnerTexts();
    expect(roleSelectOptions).toContain('Tất cả vai trò');
    expect(roleSelectOptions).toContain('Quản trị viên');
    expect(roleSelectOptions).toContain('Quản lý nhân sự');
    expect(roleSelectOptions).toContain('Chuyên viên tuyển dụng');
    expect(roleSelectOptions).toContain('Người phỏng vấn');
    expect(roleSelectOptions).toContain('Ứng viên');
    expect(roleSelectOptions).toContain('Người phê duyệt');
    expect(roleSelectOptions).toContain('Quản lý tuyển dụng');

    // Verify role select options do NOT display raw codes like 'ADMIN - Quản trị viên'
    expect(roleSelectOptions).not.toContain('ADMIN - Quản trị viên');
    expect(roleSelectOptions).not.toContain('ADMIN');

    // Verify status filter options do NOT have English in parens
    const statusSelectOptions = await page.locator('#status-filter option').allInnerTexts();
    expect(statusSelectOptions).toContain('Hoạt động');
    expect(statusSelectOptions).toContain('Bị khóa');
    expect(statusSelectOptions).not.toContain('Hoạt động (ACTIVE)');

    // Verify role badges in table (desktop) or mobile cards (mobile)
    if (width >= 1024) {
      const tableRoleTags = await page.locator('.custom-table .role-tags .tag').allInnerTexts();
      expect(tableRoleTags.length).toBeGreaterThan(0);
      expect(tableRoleTags).toContain('Chuyên viên tuyển dụng');
      // No raw role codes
      expect(tableRoleTags).not.toContain('ADMIN');
      expect(tableRoleTags).not.toContain('RECRUITER');
      expect(tableRoleTags).not.toContain('HR_MANAGER');
    } else {
      const mobileRoleTags = await page.locator('.mobile-card-roles .role-tags .tag').allInnerTexts();
      expect(mobileRoleTags.length).toBeGreaterThan(0);
      expect(mobileRoleTags).toContain('Chuyên viên tuyển dụng');
      expect(mobileRoleTags).not.toContain('ADMIN');
    }

    // Verify button hierarchy
    const addAccountBtn = page.locator('button:has-text("Thêm tài khoản")');
    await expect(addAccountBtn).toBeVisible();
    await expect(addAccountBtn).toHaveClass(/btn-primary/);

    const rbacMatrixBtn = page.locator('button:has-text("Ma trận RBAC")');
    await expect(rbacMatrixBtn).toBeVisible();
    await expect(rbacMatrixBtn).toHaveClass(/btn-secondary/);

    // Micro-interactions on toolbar
    const searchInput = page.locator('.search-wrap input');
    await searchInput.focus();
    const searchFocusedBorder = await searchInput.evaluate((el) => window.getComputedStyle(el).borderColor);
    expect(searchFocusedBorder).toBeTruthy();

    const refreshBtn = page.locator('.user-toolbar .btn-icon-only');
    await refreshBtn.hover();
    const refreshCursor = await refreshBtn.evaluate((el) => window.getComputedStyle(el).cursor);
    expect(refreshCursor).toBe('pointer');

    // Verify reduced-motion support in stylesheets
    const hasReducedMotion = await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            if ((rule as CSSMediaRule).media && (rule as CSSMediaRule).media.mediaText.includes('prefers-reduced-motion')) {
              return true;
            }
          }
        } catch {
          // ignore inaccessible stylesheets
        }
      }
      return false;
    });
    expect(hasReducedMotion).toBeTruthy();

    // Verify no horizontal overflow on users page
    const usersOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(usersOverflow).toBeFalsy();

    // Verify pagination controls and spacing
    const paginationBar = page.locator('.pagination-bar');
    await expect(paginationBar).toBeVisible();

    // Verify pagination button states
    const prevBtn = page.locator('.pagination-actions .btn').first();
    const prevDisabled = await prevBtn.isDisabled();
    expect(prevDisabled).toBeTruthy();

    const paginationMetrics = await page.evaluate(() => {
      const container = document.querySelector('.pagination-actions, .pagination-nav');
      const prevBtn = container?.querySelectorAll('button')[0];
      const indicator = container?.querySelector('.pagination-page-indicator, .pagination-current-page');
      const nextBtn = container?.querySelectorAll('button')[1];
      if (!prevBtn || !indicator || !nextBtn) return null;
      const pRect = prevBtn.getBoundingClientRect();
      const iRect = indicator.getBoundingClientRect();
      const nRect = nextBtn.getBoundingClientRect();
      return {
        gapPrevToInd: iRect.left - pRect.right,
        gapIndToNext: nRect.left - iRect.right,
        diffTop: Math.abs(pRect.top - nRect.top),
      };
    });

    expect(paginationMetrics).not.toBeNull();
    if (width >= 1024) {
      expect(paginationMetrics!.gapPrevToInd).toBeGreaterThanOrEqual(10);
      expect(paginationMetrics!.gapIndToNext).toBeGreaterThanOrEqual(10);
      expect(paginationMetrics!.diffTop).toBeLessThanOrEqual(2);
    }

    if (width === 1440) {
      await paginationBar.screenshot({
        path: '../pagination_fixed_bar.png',
      });
    }

    // Take screenshot of users page
    await page.screenshot({
      path: `../users_polish_${width}x${height}.png`,
      fullPage: false,
    });

    // 4. On desktop, test opening Modals and take screenshots
    if (width >= 1024) {
      // Test table row hover and action button hover
      const firstRow = page.locator('.custom-table tbody tr').first();
      await firstRow.hover();
      const rowTransition = await firstRow.locator('td').first().evaluate((el) => window.getComputedStyle(el).transition);
      expect(rowTransition).toContain('0.14s');

      const actionBtn = page.locator('.row-actions .btn-icon').first();
      await actionBtn.hover();
      const actionBtnTransition = await actionBtn.evaluate((el) => window.getComputedStyle(el).transition);
      expect(actionBtnTransition).toContain('0.14s');

      // Test opening Add User Modal to verify modal animation and checkbox alignment
      await page.locator('button:has-text("Thêm tài khoản")').click();
      const addModal = page.locator('.modal-box');
      await expect(addModal).toBeVisible();

      // Verify modal animation properties
      const modalAnim = await addModal.evaluate((el) => ({
        name: window.getComputedStyle(el).animationName,
        duration: window.getComputedStyle(el).animationDuration
      }));
      expect(modalAnim.name).toBe('modalEnter');
      expect(modalAnim.duration).toBe('0.19s');

      // Verify close button interaction
      const closeBtn = page.locator('.modal-header .close-btn');
      await closeBtn.hover();
      const closeBtnTransition = await closeBtn.evaluate((el) => window.getComputedStyle(el).transition);
      expect(closeBtnTransition).toContain('0.14s');

      // Check checkbox styling inside Add User Modal
      const checkboxMetrics = await page.evaluate(() => {
        const item = document.querySelector('.checkbox-item');
        const input = item?.querySelector('input[type="checkbox"]');
        const span = item?.querySelector('span');
        if (!item || !input || !span) return null;
        const iRect = input.getBoundingClientRect();
        const sRect = span.getBoundingClientRect();
        return {
          width: iRect.width,
          height: iRect.height,
          gap: sRect.left - iRect.right,
          diffTop: Math.abs(iRect.top - sRect.top),
        };
      });

      expect(checkboxMetrics).not.toBeNull();
      expect(checkboxMetrics!.width).toBeLessThanOrEqual(20);
      expect(checkboxMetrics!.height).toBeLessThanOrEqual(20);
      expect(checkboxMetrics!.gap).toBeGreaterThanOrEqual(8);
      expect(checkboxMetrics!.diffTop).toBeLessThanOrEqual(4);

      if (width === 1440) {
        await page.screenshot({
          path: '../modal_add_user_fixed.png',
          fullPage: false,
        });
      }
      await page.locator('button:has-text("Hủy")').click();

      // Test opening Role Assignment Modal and take screenshot
      const roleAssignButtons = page.locator('button[title="Phân vai trò RBAC"]');
      if (await roleAssignButtons.count() > 0) {
        await roleAssignButtons.first().click();
        const roleModal = page.locator('.modal-box');
        await expect(roleModal).toBeVisible();
        await page.screenshot({
          path: `../modal_role_polish_${width}x${height}.png`,
          fullPage: false,
        });
        await page.locator('button:has-text("Hủy")').click();
      }

      // Test opening Lock Account Modal and take screenshot
      const lockButtons = page.locator('button.lock-btn:not([disabled])');
      if (await lockButtons.count() > 0) {
        await lockButtons.first().click();
        const lockModal = page.locator('.modal-box');
        await expect(lockModal).toBeVisible();
        await page.screenshot({
          path: `../modal_lock_polish_${width}x${height}.png`,
          fullPage: false,
        });
        await page.locator('button:has-text("Hủy")').click();
      }
    }
  });
});
