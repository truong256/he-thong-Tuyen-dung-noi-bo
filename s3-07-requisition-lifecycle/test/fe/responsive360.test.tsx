import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { RequisitionStatusDialog } from '../../frontend/RequisitionStatusDialog.tsx';

const css = readFileSync(new URL('../../frontend/RequisitionStatusDialog.css', import.meta.url), 'utf8');
const req = { id: 'R1', code: 'REQ-2026-0001', title: 'Senior Backend Developer (Java/Spring Boot) - Khối Công nghệ Thông tin' };

let browser: Browser;
let page: Page;

before(async () => {
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 360, height: 640 } });
});
after(async () => { await browser?.close(); });

describe('DoD: giao diện hoạt động ở khổ 360px', () => {
  for (const action of ['PAUSE', 'CLOSE', 'CANCEL'] as const) {
    it(`${action}: không tràn ngang, nút ≥ 44px và đủ rộng để bấm`, async () => {
      const html = renderToStaticMarkup(
        <RequisitionStatusDialog open action={action} requisition={req} accessToken="t" onClose={() => {}} onDone={() => {}} />,
      );
      await page.setContent(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}${css}</style>${html}`);

      const m = await page.evaluate(() => {
        const dlg = document.querySelector('.rsd-dialog')!.getBoundingClientRect();
        const btns = [...document.querySelectorAll('.rsd-btn')].map((b) => b.getBoundingClientRect());
        const ctrls = [...document.querySelectorAll('select, textarea')].map((c) => c.getBoundingClientRect());
        return {
          docScrollW: document.documentElement.scrollWidth,
          dlgLeft: dlg.left, dlgRight: dlg.right,
          btnH: btns.map((b) => b.height), btnW: btns.map((b) => b.width),
          ctrlRight: ctrls.map((c) => c.right),
        };
      });

      assert.ok(m.docScrollW <= 360, `trang tràn ngang: ${m.docScrollW}px`);
      assert.ok(m.dlgLeft >= 0 && m.dlgRight <= 360, `hộp thoại ra ngoài màn hình (${m.dlgLeft}..${m.dlgRight})`);
      assert.ok(m.btnH.every((h) => h >= 44), `nút thấp hơn 44px: ${m.btnH}`);
      assert.ok(m.btnW.every((w) => w >= 300), `nút không full chiều rộng ở 360px: ${m.btnW}`);
      assert.ok(m.ctrlRight.every((r) => r <= 360), 'ô chọn/ô nhập tràn khỏi màn hình');
    });
  }
});
