import React from 'react';
import { Link } from 'react-router-dom';

const UnauthorizedPage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f4f8fc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '50px 35px',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: '#fff1f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <i
            className="bi bi-shield-lock-fill"
            style={{
              fontSize: '40px',
              color: '#e63946',
            }}
          ></i>
        </div>

        {/* 403 */}
        <h1
          style={{
            fontSize: '64px',
            margin: '0',
            color: '#102b86',
            fontWeight: 700,
          }}
        >
          403
        </h1>

        {/* Title */}
        <h2
          style={{
            margin: '10px 0',
            color: '#1e293b',
          }}
        >
          Không đủ quyền truy cập
        </h2>

        {/* Description */}
        <p
          style={{
            color: '#64748b',
            lineHeight: '1.7',
            margin: '15px auto 30px',
            maxWidth: '420px',
          }}
        >
          Tài khoản của bạn không có quyền truy cập vào chức năng này.
          Vui lòng liên hệ quản trị viên nếu bạn cần được cấp quyền.
        </p>

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => window.history.back()}
          >
            <i className="bi bi-arrow-left"></i>{' '}
            Quay lại
          </button>

          <Link
            to="/dashboard"
            className="btn btn-primary"
          >
            <i className="bi bi-house-door-fill"></i>{' '}
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;