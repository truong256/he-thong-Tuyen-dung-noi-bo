import { test, expect } from '@playwright/test';

const pagesToAudit = [
  { name: 'login', path: '/login' },
  { name: 'forgot-password', path: '/forgot-password' },
  { name: 'reset-password', path: '/reset-password?token=test-sample-token-123' },
];

test.describe('Typography Verification Suite', () => {
  for (const pageInfo of pagesToAudit) {
    test(`Auditing typography & Vietnamese rendering on ${pageInfo.name}`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      const bodyFont = await page.evaluate(() => window.getComputedStyle(document.body).fontFamily);
      expect(bodyFont.toLowerCase()).toContain('be vietnam pro');

      // Check form controls font-family
      const inputs = page.locator('input');
      const inputCount = await inputs.count();
      for (let i = 0; i < inputCount; i++) {
        const inputFont = await inputs.nth(i).evaluate((el) => window.getComputedStyle(el).fontFamily);
        expect(inputFont.toLowerCase()).toContain('be vietnam pro');
      }

      // Check buttons font-family
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      for (let i = 0; i < buttonCount; i++) {
        const btnFont = await buttons.nth(i).evaluate((el) => window.getComputedStyle(el).fontFamily);
        expect(btnFont.toLowerCase()).toContain('be vietnam pro');
      }

      // Check horizontal overflow
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasOverflow).toBeFalsy();
    });
  }

  test('Auditing typography on authenticated pages: Dashboard, Users, Organization, Question Bank, Profile', async ({ page }) => {
    // Login as Admin
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('#login-email, input[type="email"]').fill('admin@company.com');
    await page.locator('#login-password, input[type="password"]').fill('Password123@');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'));

    const authPages = [
      { name: 'dashboard', path: '/' },
      { name: 'users', path: '/admin/users' },
      { name: 'organization', path: '/organization' },
      { name: 'job-titles', path: '/job-titles' },
      { name: 'categories', path: '/categories' },
      { name: 'question-bank', path: '/questions' },
      { name: 'profile', path: '/profile' },
    ];

    for (const p of authPages) {
      await page.goto(p.path);
      await page.waitForLoadState('networkidle');

      const bodyFont = await page.evaluate(() => window.getComputedStyle(document.body).fontFamily);
      expect(bodyFont.toLowerCase()).toContain('be vietnam pro');

      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasOverflow).toBeFalsy();
    }
  });
});
