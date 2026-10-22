import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        backgroundColor: 'var(--bg-main, #f8fafc)',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: 'var(--radius-lg, 12px)',
          boxShadow: 'var(--shadow-card, 0 4px 20px -2px rgba(15, 23, 42, 0.08))',
          padding: '48px 36px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-50, #eff6ff)',
            color: 'var(--primary, #2563eb)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          <FileQuestion size={32} />
        </div>

        <div
          style={{
            fontSize: '3.5rem',
            fontWeight: 800,
            color: 'var(--primary, #2563eb)',
            lineHeight: 1,
            letterSpacing: '-0.03em',
            marginBottom: '8px',
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--text-primary, #0f172a)',
            margin: '0 0 8px',
          }}
        >
          Không tìm thấy trang
        </h1>

        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary, #64748b)',
            lineHeight: 1.5,
            margin: '0 0 28px',
          }}
        >
          Địa chỉ bạn đang tìm kiếm không tồn tại, đã bị xóa hoặc đã được chuyển sang đường dẫn khác.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate(-1)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>
          <Link
            to="/dashboard"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Home size={16} />
            <span>Về Trang chủ</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
