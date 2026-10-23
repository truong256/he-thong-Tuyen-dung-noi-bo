import React from 'react';
import CandidateMyApplications from '../components/candidate/CandidateMyApplications';

export const CandidateApplicationsPage: React.FC = () => {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
          Quản lý Hồ sơ & Trạng thái Ứng tuyển
        </h1>
        <p style={{ margin: 0, color: '#64748B', fontSize: '0.95rem' }}>
          Theo dõi các vị trí bạn đã nộp đơn tuyển dụng, cập nhật trạng thái phỏng vấn và chủ động rút hồ sơ khi cần thiết.
        </p>
      </div>

      <CandidateMyApplications />
    </div>
  );
};

export default CandidateApplicationsPage;
