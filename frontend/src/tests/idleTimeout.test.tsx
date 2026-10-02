import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import {
  isIdleExpired,
  recordActivity,
  getLastActivityTime,
  DEFAULT_IDLE_TIMEOUT_MS,
  setCustomIdleTimeout,
} from '../utils/idleTracker';
import { apiClient, resetSessionExpiredThrottle } from '../api/client';

describe('IDLE TIMEOUT 30 GIÂY & RESET KHI HOẠT ĐỘNG (Section 1, 2, 6)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    resetSessionExpiredThrottle();
    setCustomIdleTimeout(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const DummyProtectedPage = () => {
    return (
      <div data-testid="protected-content">
        <h1>Quản lý người dùng</h1>
        <button data-testid="dummy-action-btn" onClick={() => {}}>
          Thao tác bảo vệ
        </button>
      </div>
    );
  };

  const TestAuthProvider: React.FC<{ children: React.ReactNode; initialAuthenticated?: boolean }> = ({
    children,
    initialAuthenticated = true,
  }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated);
    const [token, setToken] = useState<string | null>(initialAuthenticated ? 'valid-token' : null);
    const [user, setUser] = useState<any>(
      initialAuthenticated
        ? { id: 1, email: 'user@company.com', fullName: 'User', role: 'RECRUITER', status: 'ACTIVE' }
        : null
    );

    const logout = vi.fn().mockImplementation(async () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setToken(null);
      setUser(null);
    });

    React.useEffect(() => {
      const handleExpired = () => {
        setIsAuthenticated(false);
        setToken(null);
        setUser(null);
      };
      window.addEventListener('ats:session-expired', handleExpired);
      return () => window.removeEventListener('ats:session-expired', handleExpired);
    }, []);

    return (
      <AuthContext.Provider
        value={{
          user,
          token,
          isAuthenticated,
          isLoading: false,
          login: vi.fn(),
          logout,
          refreshUser: vi.fn(),
          hasRole: () => true,
          hasAnyRole: () => true,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  };

  const renderApp = (initialRoute = '/dashboard') => {
    return render(
      <TestAuthProvider initialAuthenticated={true}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DummyProtectedPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <div data-testid="admin-users-page">Trang quản trị người dùng</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </TestAuthProvider>
    );
  };

  it('Test A — chưa đủ 30 giây: thao tác trước 30s được phép, không bị logout, cập nhật thời điểm hoạt động', () => {
    // 1. User is logged in
    const startTime = 1000000;
    vi.setSystemTime(startTime);
    localStorage.setItem('accessToken', 'mock-token');
    recordActivity();

    expect(isIdleExpired(DEFAULT_IDLE_TIMEOUT_MS)).toBe(false);

    // 2. Wait 20 seconds (< 30s)
    vi.advanceTimersByTime(20000);
    expect(isIdleExpired(DEFAULT_IDLE_TIMEOUT_MS)).toBe(false);

    // 3. User performs an action: records activity
    recordActivity();
    expect(getLastActivityTime()).toBe(startTime + 20000);

    // 4. Verify user is still active and not expired
    expect(isIdleExpired(DEFAULT_IDLE_TIMEOUT_MS)).toBe(false);
    expect(localStorage.getItem('accessToken')).toBe('mock-token');
  });

  it('Test B — quá 30 giây: khi thao tác tiếp theo, phát hiện idle > 30s, chặn thao tác, kết thúc session, redirect về /login với thông báo rõ ràng', async () => {
    // 1. Set start time and simulate user activity
    const now = Date.now();
    localStorage.setItem('accessToken', 'mock-token');
    // Set last activity to 35 seconds ago
    localStorage.setItem('ats:last_activity_time', (now - 35000).toString());

    // Switch back to real timers so waitFor can poll normally
    vi.useRealTimers();

    // 2. Idle timeout is detected (> 30 seconds)
    expect(isIdleExpired(DEFAULT_IDLE_TIMEOUT_MS)).toBe(true);

    // 3. Render protected route with idle expired
    renderApp('/dashboard');

    // 4. Expected: Protected content is NOT visible!
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

    // 5. Expected: Redirected to /login and displays exact required Vietnamese notification
    await waitFor(() => {
      expect(
        screen.getByText('Phiên đăng nhập đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.')
      ).toBeInTheDocument();
    });
  });

  it('Test C — hoạt động liên tục: thao tác mỗi 15-20s duy trì > 30s không bị logout', () => {
    let currentTime = 1000000;
    vi.setSystemTime(currentTime);
    localStorage.setItem('accessToken', 'mock-token');
    recordActivity();

    // Giây 0: click (bắt đầu)
    expect(isIdleExpired(DEFAULT_IDLE_TIMEOUT_MS)).toBe(false);

    // Giây 20: click
    currentTime += 20000;
    vi.setSystemTime(currentTime);
    expect(isIdleExpired(DEFAULT_IDLE_TIMEOUT_MS)).toBe(false);
    recordActivity();
    expect(getLastActivityTime()).toBe(currentTime);

    // Giây 40: click (duy trì 40s > 30s tổng thời gian)
    currentTime += 20000;
    vi.setSystemTime(currentTime);
    expect(isIdleExpired(DEFAULT_IDLE_TIMEOUT_MS)).toBe(false);
    recordActivity();
    expect(getLastActivityTime()).toBe(currentTime);

    // Giây 60: click (duy trì 60s > 30s)
    currentTime += 20000;
    vi.setSystemTime(currentTime);
    expect(isIdleExpired(DEFAULT_IDLE_TIMEOUT_MS)).toBe(false);
    recordActivity();
    expect(getLastActivityTime()).toBe(currentTime);

    // Phiên làm việc vẫn hợp lệ và access token còn nguyên
    expect(isIdleExpired(DEFAULT_IDLE_TIMEOUT_MS)).toBe(false);
    expect(localStorage.getItem('accessToken')).toBe('mock-token');
  });

  it('Chặn API protected request khi idle > 30s: interceptor hủy request và không gửi lên backend', async () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);
    localStorage.setItem('accessToken', 'mock-token');
    recordActivity();

    // Advance 31 seconds
    vi.advanceTimersByTime(31000);
    expect(isIdleExpired(DEFAULT_IDLE_TIMEOUT_MS)).toBe(true);

    const sessionExpiredSpy = vi.fn();
    window.addEventListener('ats:session-expired', sessionExpiredSpy);

    const requestConfig = {
      url: '/api/admin/users',
      headers: {} as any,
    };

    const requestInterceptor = (apiClient.interceptors.request as any).handlers[0];

    // Attempting protected request after idle timeout must reject immediately
    await expect(requestInterceptor.fulfilled(requestConfig)).rejects.toThrow();

    // Session is terminated and tokens cleared
    expect(sessionExpiredSpy).toHaveBeenCalled();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(sessionStorage.getItem('ats:auth_notice')).toBe(
      'Phiên đăng nhập đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.'
    );

    window.removeEventListener('ats:session-expired', sessionExpiredSpy);
  });
});
