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

  const { logout } = useAuth();
  const navigate = useNavigate();

  // Listen for session expiration events from api client interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      setShowSessionExpired(true);
    };

    window.addEventListener('ats:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('ats:session-expired', handleSessionExpired);
    };
  }, []);

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
      />

      <div className="app-body">
        <Sidebar
          isOpen={isMobileSidebarOpen}
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
