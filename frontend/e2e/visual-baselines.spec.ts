import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const pagesToCapture = [
  { name: 'login', path: '/login', requiresAuth: false },
  { name: 'dashboard', path: '/dashboard', requiresAuth: true },
  { name: 'profile', path: '/profile', requiresAuth: true },
  { name: 'admin-users', path: '/admin/users', requiresAuth: true },
  { name: 'admin-permissions', path: '/admin/permissions', requiresAuth: true },
  { name: 'organization', path: '/organization', requiresAuth: true },
  { name: 'job-titles', path: '/job-titles', requiresAuth: true },
  { name: 'requisitions', path: '/requisitions', requiresAuth: true },
  { name: 'job-postings', path: '/job-postings', requiresAuth: true },
  { name: 'question-bank', path: '/question-bank', requiresAuth: true },
  { name: 'approval-configuration', path: '/approval-configuration', requiresAuth: true },
  { name: 'competency-framework', path: '/competency-framework', requiresAuth: true },
];

test.describe('Baseline Screenshots Capture', () => {
  test.describe.configure({ mode: 'serial' });

  for (const pageItem of pagesToCapture) {
    test(`capture ${pageItem.name}`, async ({ page }) => {
      const mode = process.env.SNAPSHOT_MODE || 'before';
      const outputDir = path.resolve(process.cwd(), `e2e/screenshots/${mode}`);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      if (pageItem.requiresAuth) {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await page.locator('#login-email, input[type="email"]').fill('admin@company.com');
        await page.locator('#login-password').fill('Password123@');
        await page.locator('button[type="submit"]').click();
        await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
      }

      await page.goto(pageItem.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const vp = page.viewportSize();
      const vpSuffix = vp ? `${vp.width}x${vp.height}` : 'default';

      await page.screenshot({
        path: path.join(outputDir, `${pageItem.name}-${vpSuffix}.png`),
        fullPage: false,
      });
    });
  }
});
