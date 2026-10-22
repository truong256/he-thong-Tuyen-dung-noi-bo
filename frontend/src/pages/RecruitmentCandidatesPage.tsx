import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';

type Candidate = {
  id: number;
  requisitionId: number;
  jobPostingId?: number;
  fullName: string;
  email: string;
  phone?: string;
  coverLetter?: string;
  cvFileUrl?: string;
  cvFileName?: string;
  stage: string;
};

type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
};

const labels: Record<string, string> = {
  APPLIED: 'Mới ứng tuyển',
  SCREENING: 'Sàng lọc',
  SHORTLISTED: 'Qua sàng lọc',
  INTERVIEW: 'Phỏng vấn',
  OFFER: 'Đề nghị tuyển dụng',
  HIRED: 'Đã tuyển',
  REJECTED: 'Từ chối',
  WITHDRAWN: 'Đã rút hồ sơ',
};

export default function RecruitmentCandidatesPage() {
  const [items, setItems] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<PageResponse<Candidate>>(
        '/api/candidates',
        { params: { page, size: 20, ...(stage ? { stage } : {}) } }
      );
      setItems(response.data.content ?? []);
      setTotal(response.data.totalElements ?? 0);
      setPages(response.data.totalPages ?? 0);
    } catch (e: any) {
      const status = e?.response?.status;
      setError(status === 403
        ? 'Tài khoản chưa có quyền xem hồ sơ ứng viên.'
        : status === 401
          ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
          : 'Không tải được dữ liệu. Hãy kiểm tra backend rồi thử lại.');
    } finally {
      setLoading(false);
    }
  }, [page, stage]);

  useEffect(() => { void load(); }, [load]);

  const downloadCv = async (c: Candidate) => {
    if (!c.cvFileUrl) return;
    if (c.cvFileUrl.startsWith('http')) {
      window.open(c.cvFileUrl, '_blank');
      return;
    }
    try {
      const response = await apiClient.get(c.cvFileUrl, { responseType: 'blob' });
      const mimeType = (response.headers['content-type'] as string) || 'application/pdf';
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err: any) {
      alert('Không thể mở CV: ' + (err?.response?.data?.message || err.message));
    }
  };

  const moveToInterview = async (candidate: Candidate) => {
    if (updatingId !== null) return;

    const confirmed = window.confirm(
      "Xác nhận duyệt " + candidate.fullName + " vào vòng phỏng vấn?"
    );
    if (!confirmed) return;

    setUpdatingId(candidate.id);
    setActionMessage('');
    try {
      await apiClient.patch(`/api/candidates/${candidate.id}/stage`, {
        stage: 'INTERVIEW',
      });
      setActionMessage(`Đã chuyển ${candidate.fullName} sang giai đoạn Phỏng vấn.`);
      await load();
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data?.message;
      setActionMessage(
        status === 403
          ? 'Bạn không có quyền cập nhật pipeline hoặc hồ sơ nằm ngoài phạm vi phụ trách.'
          : status === 401
            ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
            : message || 'Không chuyển được ứng viên sang vòng phỏng vấn.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const keyword = search.trim().toLowerCase();
  const filtered = items.filter(c =>
    !keyword ||
    c.fullName?.toLowerCase().includes(keyword) ||
    c.email?.toLowerCase().includes(keyword) ||
    (c.phone && c.phone.includes(keyword)) ||
    String(c.requisitionId).includes(keyword)
  );

  const cell: React.CSSProperties = {
    padding: '13px 12px',
    textAlign: 'left',
    borderBottom: '1px solid #e2e8f0',
  };

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto', color: '#172033' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 8px', fontSize: 28 }}>Hồ sơ &amp; Pipeline</h1>
          <p style={{ margin: 0, color: '#64748b' }}>Quản lý hồ sơ ứng viên và tiến trình tuyển dụng.</p>
        </div>
        <button onClick={() => void load()} disabled={loading}
          style={{ padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}>
          Làm mới
        </button>
      </header>

      <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '24px 0', alignItems: 'center' }}>
        <div style={{ padding: '12px 20px', background: '#eff6ff', borderRadius: 10, minWidth: 150 }}>
          <div style={{ color: '#475569', fontSize: 13 }}>Tổng hồ sơ</div>
          <strong style={{ fontSize: 26 }}>{total}</strong>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Tìm tên, email, SĐT, mã yêu cầu..." aria-label="Tìm hồ sơ"
          style={{ flex: '1 1 240px', padding: 12, border: '1px solid #cbd5e1', borderRadius: 8 }} />
        <select value={stage} aria-label="Lọc giai đoạn"
          onChange={e => { setStage(e.target.value); setPage(0); }}
          style={{ padding: 12, border: '1px solid #cbd5e1', borderRadius: 8 }}>
          <option value="">Tất cả giai đoạn</option>
          {Object.entries(labels).map(([value, label]) =>
            <option key={value} value={value}>{label}</option>
          )}
        </select>
      </section>

      {error && <div role="alert" style={{ padding: 14, marginBottom: 16, background: '#fef2f2', color: '#b91c1c', borderRadius: 8 }}>{error}</div>}
      {actionMessage && <div role="status" style={{ padding: 14, marginBottom: 16, background: '#eff6ff', color: '#1d4ed8', borderRadius: 8 }}>{actionMessage}</div>}

      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 750 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={cell}>Mã hồ sơ</th>
              <th style={cell}>Ứng viên</th>
              <th style={cell}>Liên hệ</th>
              <th style={cell}>CV đính kèm</th>
              <th style={cell}>Mã yêu cầu</th>
              <th style={cell}>Giai đoạn</th>
              <th style={cell}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {!loading && !error && filtered.length === 0 &&
              <tr><td colSpan={7} style={{ ...cell, textAlign: 'center', color: '#64748b' }}>Không tìm thấy hồ sơ phù hợp.</td></tr>}
            {filtered.map(c => (
              <tr key={c.id}>
                <td style={cell}>HS-{c.id}</td>
                <td style={cell}>
                  <strong>{c.fullName}</strong>
                  {c.coverLetter && (
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 4, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.coverLetter}>
                      Thư: {c.coverLetter}
                    </div>
                  )}
                </td>
                <td style={cell}>
                  <div>{c.email}</div>
                  {c.phone && <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>☎ {c.phone}</div>}
                </td>
                <td style={cell}>
                  {c.cvFileUrl ? (
                    <button
                      type="button"
                      onClick={() => void downloadCv(c)}
                      title={c.cvFileName || 'Xem tệp CV'}
                      style={{
                        padding: '6px 10px',
                        fontSize: 13,
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        background: '#f8fafc',
                        color: '#1e40af',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      📎 {c.cvFileName ? (c.cvFileName.length > 18 ? c.cvFileName.slice(0, 15) + '...' : c.cvFileName) : 'Xem CV'}
                    </button>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>Không có</span>
                  )}
                </td>
                <td style={cell}>{c.requisitionId ?? '—'}</td>
                <td style={cell}>
                  <span style={{ padding: '5px 9px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 20, whiteSpace: 'nowrap' }}>
                    {labels[c.stage] ?? c.stage ?? 'Chưa xác định'}
                  </span>
                </td>
                <td style={cell}>
                  {['INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN'].includes(c.stage) ? (
                    <span style={{ color: '#64748b' }}>Không khả dụng</span>
                  ) : (
                    <button
                      onClick={() => void moveToInterview(c)}
                      disabled={updatingId !== null || loading}
                      style={{
                        padding: '8px 12px',
                        border: 0,
                        borderRadius: 7,
                        background: updatingId === c.id ? '#94a3b8' : '#2563eb',
                        color: '#fff',
                        cursor: updatingId !== null ? 'wait' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {updatingId === c.id ? 'Đang xử lý...' : 'Duyệt vào phỏng vấn'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {loading && <tr><td colSpan={7} style={{ ...cell, textAlign: 'center' }}>Đang tải hồ sơ...</td></tr>}
          </tbody>
        </table>
      </div>

      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <span style={{ color: '#64748b', fontSize: 14 }}>Tổng {total} hồ sơ · Trang {pages ? page + 1 : 0}/{pages}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={page <= 0 || loading} onClick={() => setPage(p => p - 1)}
            style={{ padding: '8px 14px', border: '1px solid #cbd5e1', borderRadius: 7 }}>Trước</button>
          <button disabled={page + 1 >= pages || loading} onClick={() => setPage(p => p + 1)}
            style={{ padding: '8px 14px', border: '1px solid #cbd5e1', borderRadius: 7 }}>Sau</button>
        </div>
      </footer>
    </main>
  );
}
