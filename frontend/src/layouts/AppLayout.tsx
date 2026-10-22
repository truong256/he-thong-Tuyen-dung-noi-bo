import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import ChangePasswordModal from '../components/auth/ChangePasswordModal';
import SessionExpiredModal from '../components/common/SessionExpiredModal';
import { useAuth } from '../hooks/useAuth';

export const AppLayout: React.FC = () => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ats_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleToggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ats_sidebar_collapsed', String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  // Listen for session expiration events from api client interceptor
  useEffect(() => {
    const handleSessionExpired = (e?: any) => {
      setShowSessionExpired(false);
      const detailMessage = e?.detail?.message;
      const detailReason = e?.detail?.reason;
      const noticeMessage =
        detailMessage ||
        (detailReason === 'idle'
          ? 'Phiên đăng nhập đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.'
          : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

      navigate('/login', {
        replace: true,
        state: {
          sessionExpired: true,
          reason: detailReason,
          message: noticeMessage,
        },
      });
    };

    window.addEventListener('ats:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('ats:session-expired', handleSessionExpired);
    };
  }, [navigate]);

  const handleSessionExpiredLoginAgain = useCallback(async () => {
    setShowSessionExpired(false);
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  return (
    <div className="app-container">
      <Header
        onChangePasswordClick={() => setShowPasswordModal(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleCollapseSidebar={handleToggleSidebarCollapse}
      />

      <div className="app-body">
        <Sidebar
          isOpen={isMobileSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          onClose={() => setIsMobileSidebarOpen(false)}
        />
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      {/* Change Password Modal (S1-04) */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      {/* Session Expired Notification Modal (S1-02) */}
      <SessionExpiredModal
        isOpen={showSessionExpired}
        onLoginAgain={handleSessionExpiredLoginAgain}
      />
    </div>
  );
};

export default AppLayout;
