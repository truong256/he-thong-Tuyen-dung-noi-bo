import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getRoleLabel } from '../constants/rbac';

interface UnauthorizedPageProps {
  statusCode?: 401 | 403;
  title?: string;
  message?: string;
}

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({
  statusCode = 403,
  title,
  message,
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const is401 = statusCode === 401 || !isAuthenticated;
  const displayCode = is401 ? '401' : '403';
  const displayTitle = title || (is401 ? 'Chưa xác thực danh tính' : 'Không đủ quyền truy cập');
  const displayMessage = message || (
    is401
      ? 'Bạn chưa đăng nhập hoặc phiên làm việc đã kết thúc. Vui lòng đăng nhập để tiếp tục truy cập.'
      : 'Tài khoản của bạn không có quyền truy cập vào chức năng này. Vui lòng liên hệ quản trị viên nếu bạn cần được cấp thêm quyền.'
  );

  const primaryRole = user?.roles && user.roles.length > 0 ? user.roles[0] : (user?.role || 'N/A');

  return (
    <div className="unauthorized-page-wrapper" data-testid="unauthorized-page">
      <div className="unauthorized-card">
        {/* Shield Icon */}
        <div className="unauthorized-icon-circle" aria-hidden="true">
          <ShieldAlert size={42} className="unauthorized-icon" />
        </div>

        {/* Status Code */}
        <div className="unauthorized-code">{displayCode}</div>

        {/* Title */}
        <h1 className="unauthorized-title">{displayTitle}</h1>

        {/* Subtitle badge / text so RoleGuard and users get clear status */}
        <div className="unauthorized-badge">
          <span>Truy cập bị từ chối</span>
        </div>

        {/* Message */}
        <p className="unauthorized-message">{displayMessage}</p>

        {/* User context if logged in */}
        {isAuthenticated && user && (
          <div className="unauthorized-user-pill">
            <span>Tài khoản: <strong>{user.email}</strong></span>
            <span className="unauthorized-role-tag">Vai trò: {getRoleLabel(primaryRole)}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="unauthorized-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate(-1)}
            aria-label="Quay lại trang trước"
          >
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>

          {is401 ? (
            <Link to="/login" className="btn btn-primary" aria-label="Đi đến trang đăng nhập">
              <LogIn size={16} />
              <span>Đăng nhập lại</span>
            </Link>
          ) : (
            <Link to="/dashboard" className="btn btn-primary" aria-label="Về trang chủ">
              <Home size={16} />
              <span>Về trang chủ</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;