/**
 * SCRUM-139 [FE] Hộp thoại tạm dừng, đóng, huỷ - kiểm thử trên trình duyệt thật.
 * Cần: npm run build:web (script test:e2e đã tự chạy).
 */
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import type { Browser, Locator, Page } from 'playwright';
import { createDemoApp } from '../../server/app.ts';
import { seedDemoData } from '../../server/seed.ts';

const { server, store } = createDemoApp(fileURLToPath(new URL('../../public/', import.meta.url)));
let browser: Browser;
let page: Page;
let base = '';

before(async () => {
  await new Promise<void>((ok) => server.listen(0, ok));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server.close(); });
beforeEach(async () => {
  seedDemoData(store);
  await page?.close();
  page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await page.goto(base);
  await page.locator('article').first().waitFor();
});

const card = (code: string): Locator => page.locator(`article[data-code="${code}"]`);
const dialog = (): Locator => page.getByRole('dialog');
const status = async (code: string): Promise<string> => {
  await page.waitForTimeout(50);
  return card(code).getByTestId('status').innerText();
};

async function open(code: string, label: string) {
  await card(code).getByRole('button', { name: label, exact: true }).click();
  await dialog().waitFor();
}

describe('SCRUM-139 | nút theo trạng thái (dùng chung state machine)', () => {
  it('Đã duyệt có Tạm dừng/Đóng/Huỷ; Tạm dừng có Tiếp tục; Đã tuyển đủ không có nút thao tác', async () => {
    const names = async (code: string) => (await card(code).getByRole('button').allInnerTexts()).map((s) => s.trim());
    assert.deepEqual(await names('REQ-2026-001'), ['Tạm dừng', 'Đóng (đã tuyển đủ)', 'Huỷ', 'Lịch sử']);
    assert.ok((await names('REQ-2026-004')).includes('Tiếp tục tuyển'));
    assert.deepEqual(await names('REQ-2026-006'), ['Lịch sử']);
  });
});

describe('SCRUM-139 | hộp thoại', () => {
  it('bắt buộc chọn lý do và hiện lỗi; "Lý do khác" bắt buộc ghi chú', async () => {
    await open('REQ-2026-002', 'Tạm dừng');
    await dialog().getByRole('button', { name: 'Tạm dừng', exact: true }).click();
    assert.ok(await dialog().getByText('Vui lòng chọn lý do.').isVisible());
    await dialog().locator('select').selectOption({ label: 'Lý do khác' });
    await dialog().getByRole('button', { name: 'Tạm dừng', exact: true }).click();
    assert.ok(await dialog().getByText(/Vui lòng nhập ghi chú/).isVisible());
    assert.equal(await status('REQ-2026-002'), 'Đã duyệt');
  });

  it('Quay lại đóng hộp thoại và không đổi gì', async () => {
    await open('REQ-2026-002', 'Huỷ');
    await dialog().getByRole('button', { name: 'Quay lại' }).click();
    assert.equal(await dialog().count(), 0);
    assert.equal(await status('REQ-2026-002'), 'Đã duyệt');
  });

  it('Tạm dừng: đổi trạng thái, tin biến mất khỏi cổng công khai', async () => {
    assert.ok(await page.getByTestId('portal-list').getByText('UI/UX Designer').isVisible());
    await open('REQ-2026-002', 'Tạm dừng');
    await dialog().locator('select').selectOption({ label: 'Đóng băng ngân sách' });
    await dialog().getByRole('button', { name: 'Tạm dừng', exact: true }).click();
    await page.getByText('thành công: REQ-2026-002').waitFor();
    assert.equal(await status('REQ-2026-002'), 'Tạm dừng');
    assert.equal(await page.getByTestId('portal-list').getByText('UI/UX Designer').count(), 0);
    assert.equal(await card('REQ-2026-002').getByTestId('live-postings').innerText(), '0');
  });

  it('Đóng khi còn ứng viên: hiện cảnh báo theo giai đoạn, "Vẫn tiếp tục" mới đóng và gỡ tin', async () => {
    await open('REQ-2026-001', 'Đóng (đã tuyển đủ)');
    await dialog().locator('select').selectOption({ label: 'Đã tuyển đủ số lượng' });
    await dialog().getByRole('button', { name: 'Đóng yêu cầu' }).click();
    const alert = dialog().getByRole('alert');
    await alert.waitFor();
    const text = await alert.innerText();
    assert.match(text, /Còn 8 ứng viên/);
    assert.match(text, /Phỏng vấn: 2 ứng viên/);
    assert.equal(await status('REQ-2026-001'), 'Đã duyệt'); // chưa đóng

    await dialog().getByRole('button', { name: 'Vẫn tiếp tục' }).click();
    await page.getByText('thành công: REQ-2026-001').waitFor();
    assert.equal(await status('REQ-2026-001'), 'Đã tuyển đủ');
    assert.equal(await page.getByTestId('portal-list').getByText('Senior Backend').count(), 0);
  });

  it('Huỷ yêu cầu không có ứng viên: huỷ ngay, ghi lịch sử người thao tác và thời điểm', async () => {
    await open('REQ-2026-002', 'Huỷ');
    await dialog().locator('select').selectOption({ label: 'Yêu cầu bị trùng' });
    await dialog().getByRole('button', { name: 'Huỷ yêu cầu' }).click();
    await page.getByText('thành công: REQ-2026-002').waitFor();
    assert.equal(await status('REQ-2026-002'), 'Huỷ');
    await card('REQ-2026-002').getByRole('button', { name: 'Lịch sử' }).click();
    const hist = await page.getByLabel('Lịch sử trạng thái').innerText();
    assert.match(hist, /u-hr-01 \(HR_MANAGER\)/);
    assert.match(hist, /Đã duyệt → Huỷ/);
    assert.match(hist, /Yêu cầu bị trùng/);
    assert.match(hist, /\d{1,2}[:/]\d{2}/);
  });

  it('Tiếp tục tuyển: Tạm dừng -> Đã duyệt', async () => {
    await card('REQ-2026-004').getByRole('button', { name: 'Tiếp tục tuyển' }).click();
    await page.getByText('Đã tiếp tục tuyển REQ-2026-004').waitFor();
    assert.equal(await status('REQ-2026-004'), 'Đã duyệt');
  });

  it('người không có quyền: server từ chối và giao diện báo lỗi, dữ liệu không đổi', async () => {
    await page.getByLabel('Vai trò đăng nhập').selectOption('demo-recruiter');
    await card('REQ-2026-003').waitFor();
    await open('REQ-2026-003', 'Huỷ');
    await dialog().locator('select').selectOption({ label: 'Cắt giảm ngân sách' });
    await dialog().getByRole('button', { name: 'Huỷ yêu cầu' }).click();
    await dialog().getByText(/Chỉ Trưởng phòng Nhân sự/).waitFor();
    assert.equal(await status('REQ-2026-003'), 'Đã duyệt');
  });
});

describe('SCRUM-139 | khổ 360px', () => {
  it('trang và hộp thoại không tràn ngang, nút ≥ 44px', async () => {
    await page.setViewportSize({ width: 360, height: 640 });
    assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 360, 'trang tràn ngang');
    await open('REQ-2026-001', 'Đóng (đã tuyển đủ)');
    const m = await page.evaluate(() => {
      const d = document.querySelector('.rsd-dialog')!.getBoundingClientRect();
      return {
        w: document.documentElement.scrollWidth,
        l: d.left, r: d.right,
        h: [...document.querySelectorAll('.rsd-btn')].map((b) => b.getBoundingClientRect().height),
      };
    });
    assert.ok(m.w <= 360 && m.l >= 0 && m.r <= 360, `tràn: ${JSON.stringify(m)}`);
    assert.ok(m.h.every((h) => h >= 44), `nút thấp: ${m.h}`);
  });
});
