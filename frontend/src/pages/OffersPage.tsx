import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';

type Candidate = {
  id: number;
  requisitionId: number;
  fullName: string;
  email: string;
  stage: string;
};

export default function OffersPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<any>('/api/candidates?page=0&size=100')
      .then(response => {
        const data = response.data;
        setCandidates(Array.isArray(data) ? data : (data.content ?? data.items ?? []));
      })
      .catch(e => setError(e?.response?.data?.message || (e instanceof Error ? e.message : 'Lỗi tải dữ liệu')))
      .finally(() => setLoading(false));
  }, []);

  const eligible = candidates.filter(c => ['SHORTLISTED', 'INTERVIEW', 'OFFER'].includes(c.stage));

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1>Offer – Đề nghị tuyển dụng</h1>
      <p>Hồ sơ phù hợp để chuẩn bị đề nghị tuyển dụng.</p>
      <section style={{ padding: 16, border: '1px solid #f59e0b', borderRadius: 12, background: '#fffbeb' }}>
        <strong>Trạng thái triển khai</strong>
        <p>Backend Offer riêng chưa được xác nhận trong dự án. Chưa thể tạo/lưu Offer hoặc đánh dấu đã gửi cho đến khi API và bảng dữ liệu Offer được triển khai.</p>
      </section>
      {error && <p role="alert">{error}</p>}
      {loading ? <p>Đang tải ứng viên...</p> : (
        <div style={{ overflowX: 'auto', marginTop: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              {['Ứng viên', 'Email', 'Requisition', 'Giai đoạn'].map(x =>
                <th key={x} style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #ddd' }}>{x}</th>
              )}
            </tr></thead>
            <tbody>
              {eligible.length === 0
                ? <tr><td colSpan={4} style={{ padding: 12 }}>Chưa có ứng viên phù hợp hoặc chưa có dữ liệu.</td></tr>
                : eligible.map(c => <tr key={c.id}>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{c.fullName}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{c.email}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{c.requisitionId}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{c.stage}</td>
                  </tr>)}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
