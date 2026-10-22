import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';

type Candidate = {
  id: number;
  requisitionId: number;
  fullName: string;
  email: string;
  stage: string;
};

const cell: React.CSSProperties = {
  padding: '12px 14px',
  borderBottom: '1px solid #e5e7eb',
  textAlign: 'left',
};

export default function CandidateApprovalsPage() {
  const [items, setItems] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/api/candidates?page=0&size=100');
      const data = response.data;
      const rows = Array.isArray(data) ? data : (data.content ?? data.items ?? []);
      setItems(rows.filter((x: Candidate) =>
        ['APPLIED', 'SCREENING', 'EVALUATED'].includes(x.stage)
      ));
    } catch (e: any) {
      const status = e?.response?.status;
      setError(
        status === 401
          ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : status === 403
            ? 'Tài khoản không đủ quyền xem danh sách duyệt ứng viên.'
            : e instanceof Error ? e.message : 'Lỗi tải dữ liệu'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function decide(candidate: Candidate, decision: 'SHORTLISTED' | 'REJECTED') {
    const reason = (reasons[candidate.id] ?? '').trim();
    if (decision === 'REJECTED' && reason.length < 5) {
      setNotice('Vui lòng nhập lý do từ chối ít nhất 5 ký tự.');
      return;
    }
    if (!window.confirm(
      `${decision === 'SHORTLISTED' ? 'Duyệt' : 'Từ chối'} hồ sơ ${candidate.fullName}?`
    )) return;

    setBusy(candidate.id);
    setNotice('');
    try {
      await apiClient.patch(`/api/candidates/${candidate.id}/stage`, {
        stage: decision,
        ...(decision === 'REJECTED' ? { reason } : {}),
      });
      setNotice(`Đã cập nhật trạng thái hồ sơ ${candidate.fullName}.`);
      await load();
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data?.message;
      setNotice(
        status === 403
          ? 'Bạn không có quyền cập nhật pipeline hoặc hồ sơ ngoài phạm vi phụ trách.'
          : status === 401
            ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
            : message || (e instanceof Error ? e.message : 'Không thể cập nhật hồ sơ')
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1>Duyệt ứng viên</h1>
      <p>Danh sách hồ sơ cần xem xét. Quyết định được gửi đến API backend hiện có.</p>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Ứng viên', 'Email', 'Mã requisition', 'Giai đoạn', 'Lý do từ chối', 'Thao tác'].map(x =>
                <th key={x} style={cell}>{x}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={cell}>Đang tải hồ sơ...</td></tr>}
            {!loading && !error && items.length === 0 &&
              <tr><td colSpan={6} style={cell}>Không có hồ sơ cần duyệt.</td></tr>}
            {items.map(candidate => (
              <tr key={candidate.id}>
                <td style={cell}>{candidate.fullName}</td>
                <td style={cell}>{candidate.email}</td>
                <td style={cell}>{candidate.requisitionId}</td>
                <td style={cell}>{candidate.stage}</td>
                <td style={cell}>
                  <input
                    aria-label={`Lý do từ chối ${candidate.fullName}`}
                    value={reasons[candidate.id] ?? ''}
                    onChange={e => setReasons(prev => ({ ...prev, [candidate.id]: e.target.value }))}
                    placeholder="Nhập lý do..."
                    style={{ width: 160, padding: 8 }}
                  />
                </td>
                <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                  <button disabled={busy === candidate.id} onClick={() => void decide(candidate, 'SHORTLISTED')}>
                    Duyệt
                  </button>{' '}
                  <button disabled={busy === candidate.id} onClick={() => void decide(candidate, 'REJECTED')}>
                    Từ chối
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button style={{ marginTop: 16 }} onClick={() => void load()}>Tải lại</button>
    </main>
  );
}
