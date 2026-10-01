import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div style={{ textAlign: 'center', padding: '100px 20px', background: '#f4f8fc', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '4rem', color: '#102b86', margin: 0 }}>404</h1>
      <h2 style={{ color: '#1e293b', marginTop: '10px' }}>Trang không tồn tại</h2>
      <p style={{ color: '#64748b', maxWidth: '400px', margin: '15px auto 30px' }}>
        Địa chỉ bạn yêu cầu không tồn tại hoặc đã bị di chuyển.
      </p>
      <Link to="/dashboard" className="btn btn-primary">
        <i className="bi bi-house-door-fill"></i> Về Trang chủ
      </Link>
    </div>
  );
};

export default NotFoundPage;
