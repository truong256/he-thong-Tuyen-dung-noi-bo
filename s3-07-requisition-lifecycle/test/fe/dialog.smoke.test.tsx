import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { RequisitionStatusDialog } from '../../frontend/RequisitionStatusDialog.tsx';

const req = { id: 'R1', code: 'REQ-001', title: 'Backend Developer' };
const base = { requisition: req, accessToken: 't', onClose() {}, onDone() {} };

describe('RequisitionStatusDialog (render)', () => {
  it('đóng -> không render gì', () => {
    assert.equal(renderToStaticMarkup(<RequisitionStatusDialog {...base} open={false} action="PAUSE" />), '');
  });

  for (const [action, title, label, reason] of [
    ['PAUSE', 'Tạm dừng tuyển dụng', 'Tạm dừng', 'Đóng băng ngân sách'],
    ['CLOSE', 'Đóng yêu cầu (đã tuyển đủ)', 'Đóng yêu cầu', 'Đã tuyển đủ số lượng'],
    ['CANCEL', 'Huỷ yêu cầu tuyển dụng', 'Huỷ yêu cầu', 'Không còn nhu cầu tuyển'],
  ] as const) {
    it(`${action}: tiêu đề, mã yêu cầu, danh sách lý do, nút xác nhận, vai trò dialog`, () => {
      const html = renderToStaticMarkup(<RequisitionStatusDialog {...base} open action={action} />);
      for (const s of [title, label, reason, 'REQ-001', 'role="dialog"', 'aria-modal="true"', 'Quay lại', 'Ghi chú']) {
        assert.ok(html.includes(s), `thiếu: ${s}`);
      }
    });
  }
});
