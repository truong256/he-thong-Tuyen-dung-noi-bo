import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
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

interface ScreenshotMetadataItem {
  page: string;
  viewport: string;
  filename: string;
  width: number;
  height: number;
  capturedAt: string;
  url: string;
}

interface RunMetadata {
  commitSha: string;
  mode: 'before' | 'after';
  updatedAt: string;
  screenshots: Record<string, ScreenshotMetadataItem>;
}

function getGitCommitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return process.env.CURRENT_COMMIT_SHA || 'unknown';
  }
}

function updateMetadataFile(metaPath: string, commitSha: string, mode: 'before' | 'after', item: ScreenshotMetadataItem) {
  let meta: RunMetadata = {
    commitSha,
    mode,
    updatedAt: new Date().toISOString(),
    screenshots: {},
  };
  if (fs.existsSync(metaPath)) {
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch {
      // Use clean meta structure
    }
  }
  meta.commitSha = commitSha;
  meta.mode = mode;
  meta.updatedAt = new Date().toISOString();
  if (!meta.screenshots) {
    meta.screenshots = {};
  }
  meta.screenshots[`${item.page}-${item.viewport}`] = item;
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
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

  for (const pageItem of pagesToCapture) {
    test(`capture and verify ${pageItem.name}`, async ({ page }) => {
      // REQUIREMENT A: Strictly forbid defaulting SNAPSHOT_MODE to 'before'. Must be explicitly declared.
      const rawMode = (process.env.SNAPSHOT_MODE || '').trim().toLowerCase();
      if (rawMode !== 'before' && rawMode !== 'after') {
        throw new Error(
          `[FATAL INTEGRITY ERROR] SNAPSHOT_MODE must be explicitly set to either "before" or "after". Received: "${process.env.SNAPSHOT_MODE || ''}". Defaulting to "before" is strictly disallowed to prevent accidental overwriting of baseline captures.`
        );
      }
      const mode = rawMode as 'before' | 'after';

      const testPassword = process.env.TEST_USER_PASSWORD;
      if (!testPassword) {
        throw new Error(
          'Missing required environment variable TEST_USER_PASSWORD. Running visual baseline tests requires TEST_USER_PASSWORD to be explicitly set in the development/CI environment.'
        );
      }

      const baselineCommit = (process.env.BASELINE_COMMIT || 'ba299a3').trim();
      const currentCommit = (process.env.CURRENT_COMMIT_SHA || getGitCommitSha()).trim();

      const baselineCommitDir = path.resolve(process.cwd(), 'e2e/screenshots/baselines', baselineCommit);
      const legacyBeforeDir = path.resolve(process.cwd(), 'e2e/screenshots/before');
      const afterDir = path.resolve(process.cwd(), 'e2e/screenshots/after');
      const diffDir = path.resolve(process.cwd(), 'e2e/screenshots/diff');

      // Base URL override if capturing baseline from a separate server (e.g. baseline worktree)
      const baseUrl = (mode === 'before' && process.env.BASELINE_URL) ? process.env.BASELINE_URL : '';

      // Handle Authentication with strict assertion
      if (pageItem.requiresAuth) {
        const loginEmail = pageItem.authEmail || 'admin@company.com';

        // Security check: Never run visual test against external or production email domains
        if (!loginEmail.endsWith('@company.com') && !loginEmail.endsWith('.local') && !loginEmail.endsWith('@test.local')) {
          throw new Error(`Forbidden test email domain: "${loginEmail}". Visual tests are strictly limited to internal development/test accounts.`);
        }

        await page.goto(`${baseUrl}/login`);
        await page.waitForLoadState('networkidle');

        await page.locator('#login-email, input[type="email"]').fill(loginEmail);
        await page.locator('#login-password').fill(testPassword);
        await page.locator('button[type="submit"]').click();

        // Must succeed without swallowed errors
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        expect(page.url()).toContain('/dashboard');
      }

      // Navigate to target route only if not already there
      const expectedPathSegment = pageItem.path.split('?')[0];
      if (!page.url().includes(expectedPathSegment)) {
        await page.goto(`${baseUrl}${pageItem.path}`);
        await page.waitForLoadState('networkidle');
      }
      await page.waitForTimeout(600);

      // Determinism: Freeze animations, transitions, and hide blinking carets
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
            caret-color: transparent !important;
          }
        `,
      });
      await page.waitForTimeout(200);

      // Verify that the page did not fall back to 404, 403 or unauthenticated Login
      const currentUrl = page.url();
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

      // CAPTURE BASELINE MODE ('before')
      if (mode === 'before') {
        const baselinePath = path.join(baselineCommitDir, filename);
        const legacyPath = path.join(legacyBeforeDir, filename);

        fs.mkdirSync(baselineCommitDir, { recursive: true });
        fs.mkdirSync(legacyBeforeDir, { recursive: true });

        // Capture screenshot with masked passwords
        await page.screenshot({
          path: baselinePath,
          fullPage: false,
          mask: [page.locator('input[type="password"]')],
        });

        // Mirror to legacy before directory for backwards compatibility
        fs.copyFileSync(baselinePath, legacyPath);

        const metadataItem: ScreenshotMetadataItem = {
          page: pageItem.name,
          viewport: vpSuffix,
          filename,
          width: vp?.width || 0,
          height: vp?.height || 0,
          capturedAt: new Date().toISOString(),
          url: currentUrl,
        };

        updateMetadataFile(path.join(baselineCommitDir, 'metadata.json'), baselineCommit, 'before', metadataItem);
        updateMetadataFile(path.join(legacyBeforeDir, 'metadata.json'), baselineCommit, 'before', metadataItem);

        console.log(`[BASELINE CAPTURE] Saved baseline for ${pageItem.name} (${vpSuffix}) [commit: ${baselineCommit}]`);
        return;
      }

      // COMPARISON MODE ('after')
      if (mode === 'after') {
        fs.mkdirSync(afterDir, { recursive: true });
        const afterScreenshotPath = path.join(afterDir, filename);

        await page.screenshot({
          path: afterScreenshotPath,
          fullPage: false,
          mask: [page.locator('input[type="password"]')],
        });

        const afterMetadataItem: ScreenshotMetadataItem = {
          page: pageItem.name,
          viewport: vpSuffix,
          filename,
          width: vp?.width || 0,
          height: vp?.height || 0,
          capturedAt: new Date().toISOString(),
          url: currentUrl,
        };
        updateMetadataFile(path.join(afterDir, 'metadata.json'), currentCommit, 'after', afterMetadataItem);

        // Resolve baseline image: first try baselineCommitDir, then legacyBeforeDir
        const candidateBeforePaths = [
          path.join(baselineCommitDir, filename),
          path.join(legacyBeforeDir, filename),
          ...(pageItem.legacyNames || []).flatMap((leg) => [
            path.join(baselineCommitDir, `${leg}-${vpSuffix}.png`),
            path.join(legacyBeforeDir, `${leg}-${vpSuffix}.png`),
          ]),
        ];

        let resolvedBeforePath: string | null = null;
        for (const candPath of candidateBeforePaths) {
          if (fs.existsSync(candPath)) {
            resolvedBeforePath = candPath;
            break;
          }
        }

        if (!resolvedBeforePath) {
          throw new Error(
            `Baseline before image for "${pageItem.name}" (${vpSuffix}) not found in ${baselineCommitDir} or ${legacyBeforeDir}. Run SNAPSHOT_MODE=before first from commit ${baselineCommit}.`
          );
        }

        const beforeBuf = fs.readFileSync(resolvedBeforePath);
        const afterBuf = fs.readFileSync(afterScreenshotPath);
        const diffPath = path.join(diffDir, filename);

        const { diffRatio, diffPixels, totalPixels } = comparePngBuffers(beforeBuf, afterBuf, diffPath);

        const MAX_DIFF_THRESHOLD = Number(
          process.env.VISUAL_DIFF_THRESHOLD || (vpSuffix.includes('1440') ? '0.05' : '0.08')
        );
        const percent = (diffRatio * 100).toFixed(2);

        // Record to diff-report.json with commit tracking
        const diffReportPath = path.resolve(process.cwd(), 'e2e/screenshots/diff-report.json');
        let reportData: any[] = [];
        if (fs.existsSync(diffReportPath)) {
          try {
            reportData = JSON.parse(fs.readFileSync(diffReportPath, 'utf-8'));
          } catch {
            reportData = [];
          }
        }
        reportData = reportData.filter((r) => r.key !== `${pageItem.name}-${vpSuffix}`);
        reportData.push({
          key: `${pageItem.name}-${vpSuffix}`,
          page: pageItem.name,
          viewport: vpSuffix,
          baselineCommit,
          currentCommit,
          diffPixels,
          totalPixels,
          diffPercent: Number((diffRatio * 100).toFixed(3)),
          threshold: MAX_DIFF_THRESHOLD,
          passed: diffRatio <= MAX_DIFF_THRESHOLD,
          diffImage: `diff/${filename}`,
          comparedAt: new Date().toISOString(),
        });
        fs.writeFileSync(diffReportPath, JSON.stringify(reportData, null, 2), 'utf-8');

        console.log(`[VISUAL DIFF] ${pageItem.name} (${vpSuffix}) [baseline: ${baselineCommit} vs target: ${currentCommit}]: ${diffPixels}/${totalPixels} pixels differ (${percent}%)`);

        if (diffRatio > MAX_DIFF_THRESHOLD) {
          throw new Error(
            `Visual regression detected on page "${pageItem.name}" (${vpSuffix}): ${diffPixels}/${totalPixels} pixels differ (${percent}% > ${MAX_DIFF_THRESHOLD * 100}% threshold). Diff image saved to ${diffPath}.`
          );
        }
      }
    });
  }
});
