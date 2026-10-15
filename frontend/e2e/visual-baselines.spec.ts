import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

interface PageTarget {
  name: string;
  path: string;
  requiresAuth: boolean;
  authEmail?: string;
  legacyNames?: string[];
  mainSelector?: string;
}

const pagesToCapture: PageTarget[] = [
  {
    name: 'login',
    path: '/login',
    requiresAuth: false,
    mainSelector: '.auth-split-viewport, .auth-login-card, #login-email',
  },
  {
    name: 'dashboard',
    path: '/dashboard',
    requiresAuth: true,
    mainSelector: '.page-container-dashboard, .dashboard-content, .dashboard-hero-title',
  },
  {
    name: 'profile',
    path: '/profile',
    requiresAuth: true,
    mainSelector: '.profile-summary-header, .page-container-profile, .profile-page-clean-container',
  },
  {
    name: 'admin-users',
    path: '/admin/users',
    requiresAuth: true,
    mainSelector: '.admin-page, .page-container-standard, table, .table-container',
  },
  {
    name: 'admin-permission-matrix',
    path: '/admin/permission-matrix',
    requiresAuth: true,
    legacyNames: ['admin-permissions'],
    mainSelector: '.pmatrix-page',
  },
  {
    name: 'organization',
    path: '/organization',
    requiresAuth: true,
    mainSelector: '.org-page-container, .page-container, .org-hero-title',
  },
  {
    name: 'job-titles',
    path: '/job-titles',
    requiresAuth: true,
    mainSelector: '.jt-page-container, .page-container, table, .jt-table',
  },
  {
    name: 'requisitions',
    path: '/recruitment/requisitions',
    requiresAuth: true,
    legacyNames: ['requisitions'],
    mainSelector: '.rr-page-container, .page-container, table, .rr-table',
  },
  {
    name: 'job-postings',
    path: '/recruitment/job-postings',
    requiresAuth: true,
    legacyNames: ['job-postings'],
    mainSelector: '.jp-management-page, .page-container, h1, h2',
  },
  {
    name: 'questions',
    path: '/questions',
    requiresAuth: true,
    legacyNames: ['question-bank'],
    mainSelector: '.qb-page-container, .page-container, table, .qb-table',
  },
  {
    name: 'approval-configurations',
    path: '/recruitment/approval-configurations',
    requiresAuth: true,
    authEmail: 'hr_manager@company.com',
    legacyNames: ['approval-configuration'],
    mainSelector: '.approval-config-page, .page-container, h1, h2',
  },
  {
    name: 'competencies',
    path: '/competencies',
    requiresAuth: true,
    legacyNames: ['competency-framework'],
    mainSelector: '.cf-page-container, .page-container, table, .cf-table',
  },
];

/**
 * Normalizes two PNG buffers to matching dimensions and computes pixel difference.
 */
function comparePngBuffers(beforeBuf: Buffer, afterBuf: Buffer, diffPath: string): {
  diffRatio: number;
  diffPixels: number;
  totalPixels: number;
} {
  const img1 = PNG.sync.read(beforeBuf);
  const img2 = PNG.sync.read(afterBuf);

  const width = Math.max(img1.width, img2.width);
  const height = Math.max(img1.height, img2.height);

  const norm1 = new PNG({ width, height });
  PNG.bitblt(img1, norm1, 0, 0, img1.width, img1.height, 0, 0);

  const norm2 = new PNG({ width, height });
  PNG.bitblt(img2, norm2, 0, 0, img2.width, img2.height, 0, 0);

  const diff = new PNG({ width, height });
  const pixelmatchFn: any = (pixelmatch as any).default || pixelmatch;

  const diffPixels = pixelmatchFn(
    norm1.data,
    norm2.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );

  const totalPixels = width * height;
  const diffRatio = totalPixels > 0 ? diffPixels / totalPixels : 0;

  const diffDir = path.dirname(diffPath);
  if (!fs.existsSync(diffDir)) {
    fs.mkdirSync(diffDir, { recursive: true });
  }
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  return { diffRatio, diffPixels, totalPixels };
}

test.describe('Baseline Screenshots Capture and Visual Regression', () => {
  test.describe.configure({ mode: 'serial' });

  for (const pageItem of pagesToCapture) {
    test(`capture and verify ${pageItem.name}`, async ({ page }) => {
      const mode = (process.env.SNAPSHOT_MODE || 'before').toLowerCase();
      const defaultPassword = process.env.TEST_USER_PASSWORD || 'Password123@';
      const outputDir = path.resolve(process.cwd(), `e2e/screenshots/${mode}`);
      const beforeDir = path.resolve(process.cwd(), 'e2e/screenshots/before');
      const diffDir = path.resolve(process.cwd(), 'e2e/screenshots/diff');

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Handle Authentication with strict assertion
      if (pageItem.requiresAuth) {
        const loginEmail = pageItem.authEmail || 'admin@company.com';
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        await page.locator('#login-email, input[type="email"]').fill(loginEmail);
        await page.locator('#login-password').fill(defaultPassword);
        await page.locator('button[type="submit"]').click();

        // Must succeed without swallowed errors
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        expect(page.url()).toContain('/dashboard');
      }

      // Navigate to target route
      await page.goto(pageItem.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Verify that the page did not fall back to 404, 403 or Login
      const currentUrl = page.url();
      const expectedPathSegment = pageItem.path.split('?')[0];
      expect(currentUrl).toContain(expectedPathSegment);

      const bodyText = await page.locator('body').innerText();
      expect(bodyText).not.toContain('404');
      expect(bodyText).not.toContain('Không tìm thấy trang');
      expect(bodyText).not.toContain('Tài khoản không có quyền truy cập');
      if (pageItem.requiresAuth) {
        expect(bodyText).not.toContain('Đăng nhập để tiếp tục');
      }

      // Verify main content container is rendered
      if (pageItem.mainSelector) {
        const selectorLocator = page.locator(pageItem.mainSelector).first();
        await expect(selectorLocator).toBeVisible();
      }

      const vp = page.viewportSize();
      const vpSuffix = vp ? `${vp.width}x${vp.height}` : 'default';
      const filename = `${pageItem.name}-${vpSuffix}.png`;
      const currentScreenshotPath = path.join(outputDir, filename);

      await page.screenshot({
        path: currentScreenshotPath,
        fullPage: false,
      });

      // Visual Comparison in 'after' mode
      if (mode === 'after') {
        const candidateBeforeNames = [
          filename,
          ...(pageItem.legacyNames || []).map((leg) => `${leg}-${vpSuffix}.png`),
        ];

        let resolvedBeforePath: string | null = null;
        for (const cand of candidateBeforeNames) {
          const candPath = path.join(beforeDir, cand);
          if (fs.existsSync(candPath)) {
            resolvedBeforePath = candPath;
            break;
          }
        }

        if (!resolvedBeforePath) {
          throw new Error(
            `Baseline before image for "${pageItem.name}" (${vpSuffix}) not found in ${beforeDir}. Please run SNAPSHOT_MODE=before first to establish baselines.`
          );
        }

        const beforeBuf = fs.readFileSync(resolvedBeforePath);
        const afterBuf = fs.readFileSync(currentScreenshotPath);
        const diffPath = path.join(diffDir, filename);

        const { diffRatio, diffPixels, totalPixels } = comparePngBuffers(beforeBuf, afterBuf, diffPath);

        const MAX_DIFF_THRESHOLD = 0.05; // 5% maximum difference
        const percent = (diffRatio * 100).toFixed(2);

        if (diffRatio > MAX_DIFF_THRESHOLD) {
          throw new Error(
            `Visual regression detected on page "${pageItem.name}" (${vpSuffix}): ${diffPixels}/${totalPixels} pixels differ (${percent}% > ${MAX_DIFF_THRESHOLD * 100}% threshold). Diff image saved to ${diffPath}.`
          );
        }
      }
    });
  }
});
