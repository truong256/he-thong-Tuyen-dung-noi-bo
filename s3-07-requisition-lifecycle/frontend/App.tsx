import { useCallback, useEffect, useState } from 'react';
import { RequisitionStatusDialog } from './RequisitionStatusDialog.tsx';
import { availableActions, ACTIONS } from './dialogModel.ts';
import type { DialogAction } from './dialogModel.ts';
import { REASONS } from '../src/domain/reasons.ts';
import { STATUS_LABELS_VI } from '../src/domain/types.ts';
import type { RequisitionStatus, StatusHistoryEntry } from '../src/domain/types.ts';

interface Row {
  id: string;
  code: string;
  title: string;
  status: RequisitionStatus;
  statusReasonCode: string | null;
  postings: { id: string; status: string }[];
  pipeline: { total: number };
}
interface PublicPosting { id: string; title: string }

const USERS = {
  'demo-hr': 'Trưởng phòng Nhân sự (HR)',
  'demo-recruiter': 'Nhân viên tuyển dụng (không có quyền)',
} as const;
type Token = keyof typeof USERS;

const ACTION_LABEL: Record<DialogAction, string> = { PAUSE: 'Tạm dừng', CLOSE: 'Đóng (đã tuyển đủ)', CANCEL: 'Huỷ' };

function reasonLabel(code: string | null): string {
  if (!code) return '-';
  for (const list of Object.values(REASONS)) {
    const hit = list?.find((r) => r.code === code);
    if (hit) return hit.label;
  }
  return code;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export function App() {
  const [token, setToken] = useState<Token>('demo-hr');
  const [rows, setRows] = useState<Row[]>([]);
  const [portal, setPortal] = useState<PublicPosting[]>([]);
  const [dialog, setDialog] = useState<{ action: DialogAction; row: Row } | null>(null);
  const [history, setHistory] = useState<{ row: Row; entries: StatusHistoryEntry[] } | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const auth = { Authorization: `Bearer ${token}` };

  const reload = useCallback(async () => {
    const [r, p] = await Promise.all([
      fetch('/api/requisitions', { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json()),
      fetch('/api/public/postings').then((x) => x.json()),
    ]);
    setRows(r as Row[]);
    setPortal(p as PublicPosting[]);
  }, [token]);

  useEffect(() => { void reload(); }, [reload]);

  async function resume(row: Row) {
    setMessage(null);
    const res = await fetch(`/api/requisitions/${row.id}/status`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetStatus: 'APPROVED' }),
    });
    if (res.status === 200) {
      await reload();
      setMessage({ kind: 'ok', text: `Đã tiếp tục tuyển ${row.code}. Tin tuyển dụng cần được đăng lại.` });
    } else {
      const b = (await res.json()) as { error: { message: string } };
      setMessage({ kind: 'err', text: b.error.message });
    }
  }

  async function showHistory(row: Row) {
    const res = await fetch(`/api/requisitions/${row.id}/status-history`, { headers: auth });
    if (res.status === 200) setHistory({ row, entries: (await res.json()) as StatusHistoryEntry[] });
    else setMessage({ kind: 'err', text: ((await res.json()) as { error: { message: string } }).error.message });
  }

  async function resetDemo() {
    await fetch('/api/demo/reset', { method: 'POST' });
    setMessage(null);
    setHistory(null);
    await reload();
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>Yêu cầu tuyển dụng</h1>
        <p className="app-sub">S3-07 · Tạm dừng, đóng hoặc huỷ yêu cầu</p>
        <label className="app-user">
          <span>Đăng nhập với vai trò</span>
          <select value={token} onChange={(e) => { setToken(e.target.value as Token); setMessage(null); setHistory(null); }} aria-label="Vai trò đăng nhập">
            {(Object.keys(USERS) as Token[]).map((t) => <option key={t} value={t}>{USERS[t]}</option>)}
          </select>
        </label>
        <button type="button" className="app-btn app-btn-ghost" onClick={() => void resetDemo()}>Đặt lại dữ liệu mẫu</button>
      </header>

      {message && <p role="status" className={message.kind === 'ok' ? 'app-msg app-msg-ok' : 'app-msg app-msg-err'}>{message.text}</p>}

      <section aria-label="Danh sách yêu cầu" className="app-list">
        {rows.map((row) => {
          const live = row.postings.filter((p) => p.status === 'PUBLISHED').length;
          return (
            <article key={row.id} className="app-card" data-code={row.code}>
              <div className="app-card-head">
                <strong>{row.code}</strong>
                <span className={`app-badge app-badge-${row.status}`} data-testid="status">{STATUS_LABELS_VI[row.status]}</span>
              </div>
              <p className="app-card-title">{row.title}</p>
              <p className="app-meta">
                Tin đang đăng: <b data-testid="live-postings">{live}</b> · Ứng viên trong pipeline: <b data-testid="pipeline-count">{row.pipeline.total}</b>
              </p>
              {row.statusReasonCode && <p className="app-meta">Lý do: {reasonLabel(row.statusReasonCode)}</p>}
              <div className="app-actions">
                {availableActions(row.status).map((a) => (
                  <button key={a} type="button" className={`app-btn ${a === 'PAUSE' ? '' : 'app-btn-danger-outline'}`} onClick={() => { setMessage(null); setDialog({ action: a, row }); }}>
                    {ACTION_LABEL[a]}
                  </button>
                ))}
                {row.status === 'PAUSED' && <button type="button" className="app-btn app-btn-primary" onClick={() => void resume(row)}>Tiếp tục tuyển</button>}
                <button type="button" className="app-btn app-btn-ghost" onClick={() => void showHistory(row)}>Lịch sử</button>
              </div>
            </article>
          );
        })}
      </section>

      <section aria-label="Cổng tuyển dụng công khai" className="app-portal">
        <h2>Cổng tuyển dụng công khai</h2>
        <p className="app-meta">Những tin ứng viên đang nhìn thấy ngoài cổng:</p>
        {portal.length === 0 ? <p data-testid="portal-empty">Không có tin nào đang đăng.</p> : (
          <ul data-testid="portal-list">{portal.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
        )}
      </section>

      {history && (
        <section aria-label="Lịch sử trạng thái" className="app-history">
          <h2>Lịch sử {history.row.code}</h2>
          {history.entries.length === 0 ? <p>Chưa có thao tác nào.</p> : (
            <ul>
              {history.entries.map((h) => (
                <li key={h.id}>
                  <b>{fmt(h.occurredAt)}</b> · {h.actorId} ({h.actorRole}): {STATUS_LABELS_VI[h.fromStatus]} → {STATUS_LABELS_VI[h.toStatus]}
                  {h.reasonCode ? ` · Lý do: ${reasonLabel(h.reasonCode)}` : ''}
                  {h.unpublishedPostingIds.length > 0 ? ` · Đã gỡ tin: ${h.unpublishedPostingIds.join(', ')}` : ''}
                  {h.pipelineAcknowledged > 0 ? ` · Đã xác nhận ${h.pipelineAcknowledged} ứng viên còn lại` : ''}
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="app-btn app-btn-ghost" onClick={() => setHistory(null)}>Đóng lịch sử</button>
        </section>
      )}

      {dialog && (
        <RequisitionStatusDialog
          key={`${dialog.row.id}-${dialog.action}`}
          open
          action={dialog.action}
          requisition={dialog.row}
          accessToken={token}
          onClose={() => setDialog(null)}
          onDone={() => {
            const text = `${ACTIONS[dialog.action].confirmLabel} thành công: ${dialog.row.code}.`;
            setDialog(null);
            // Tải lại dữ liệu xong mới báo thành công để màn hình luôn khớp với thông báo.
            void reload().then(() => setMessage({ kind: 'ok', text }));
          }}
        />
      )}
    </main>
  );
}
