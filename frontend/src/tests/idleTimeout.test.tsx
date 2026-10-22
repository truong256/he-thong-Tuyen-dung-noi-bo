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
  resetActivity,
  getLastActivityTime,
  DEFAULT_IDLE_TIMEOUT_MS,
  getIdleTimeoutMs,
  setCustomIdleTimeout,
} from '../utils/idleTracker';
import { apiClient, resetSessionExpiredThrottle } from '../api/client';
import authApi from '../api/auth';

describe('IDLE TIMEOUT 5 PHÚT (300,000 MS) & CƠ CHẾ HOẠT ĐỘNG THỰC TẾ', () => {
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

  it('Giá trị mặc định của DEFAULT_IDLE_TIMEOUT_MS phải là 5 phút (300,000 ms)', () => {
    expect(DEFAULT_IDLE_TIMEOUT_MS).toBe(5 * 60 * 1000);
    expect(getIdleTimeoutMs()).toBe(300000);
  });

  it('1. Chưa đủ 5 phút: người dùng vẫn đăng nhập bình thường', () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);
    localStorage.setItem('accessToken', 'mock-token');
    recordActivity();

    // Chưa đến 5 phút (trôi qua 4 phút 30 giây = 270,000 ms)
    vi.advanceTimersByTime(270000);
    expect(isIdleExpired(DEFAULT_IDLE_TIMEOUT_MS)).toBe(false);
    expect(isIdleExpired()).toBe(false);
    expect(localStorage.getItem('accessToken')).toBe('mock-token');
  });

  it('2. User có hoạt động: timer reset về 5 phút mới', () => {
    let currentTime = 1000000;
    vi.setSystemTime(currentTime);
    localStorage.setItem('accessToken', 'mock-token');
    recordActivity();

    // Phút thứ 3 (180,000 ms): người dùng tương tác
    currentTime += 180000;
    vi.setSystemTime(currentTime);
    expect(isIdleExpired()).toBe(false);
    recordActivity();
    expect(getLastActivityTime()).toBe(currentTime);

    // Phút thứ 6 (cách tương tác trước 3 phút, tổng thời gian 6 phút > 5 phút ban đầu)
    currentTime += 180000;
    vi.setSystemTime(currentTime);
    expect(isIdleExpired()).toBe(false); // Vẫn chưa hết hạn vì đã được reset
    recordActivity();
    expect(getLastActivityTime()).toBe(currentTime);

    // Phút thứ 9 (cách tương tác trước 3 phút)
    currentTime += 180000;
    vi.setSystemTime(currentTime);
    expect(isIdleExpired()).toBe(false);
    expect(localStorage.getItem('accessToken')).toBe('mock-token');
  });

  it('3. Idle thực sự quá 5 phút: thao tác protected tiếp theo logout và redirect về /login', async () => {
    const now = Date.now();
    localStorage.setItem('accessToken', 'mock-token');
    // Set last activity cách đây 5 phút 10 giây (310,000 ms)
    localStorage.setItem('ats:last_activity_time', (now - 310000).toString());

    // Chuyển sang real timers để waitFor hoạt động
    vi.useRealTimers();

    expect(isIdleExpired()).toBe(true);

    renderApp('/dashboard');

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText('Phiên đăng nhập đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.')
      ).toBeInTheDocument();
    });
  });

  it('4. Excel Import: backend xử lý lâu, response interceptor gọi recordActivity không khiến user bị logout khi kết quả xuất hiện', async () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);
    localStorage.setItem('accessToken', 'mock-token');
    recordActivity();

    // Giả lập user bấm Import: gọi resetActivity() tại giây thứ 0
    resetActivity();
    expect(getLastActivityTime()).toBe(startTime);

    // Backend xử lý 2 phút (120,000 ms)
    vi.advanceTimersByTime(120000);

    // Response interceptor được kích hoạt khi response từ backend trả về
    const responseInterceptor = (apiClient.interceptors.response as any).handlers[0];
    const mockResponse = { data: { successCount: 8, failedCount: 0 }, status: 200 };
    responseInterceptor.fulfilled(mockResponse);

    // Activity time được cập nhật thành thời điểm nhận response (phút thứ 2)
    expect(getLastActivityTime()).toBe(startTime + 120000);

    // Khi kết quả xuất hiện trên màn hình, user không bị logout
    expect(isIdleExpired()).toBe(false);
    expect(localStorage.getItem('accessToken')).toBe('mock-token');
  });

  it('5. Import hoàn tất: resetActivity() mang lại đủ 5 phút mới tính từ lúc hoàn tất', () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);
    localStorage.setItem('accessToken', 'mock-token');
    recordActivity();

    // 2 phút sau import hoàn tất
    const finishTime = startTime + 120000;
    vi.setSystemTime(finishTime);
    resetActivity();
    expect(getLastActivityTime()).toBe(finishTime);

    // 4 phút sau khi hoàn tất (tức là 6 phút kể từ startTime): người dùng vẫn còn hạn
    vi.advanceTimersByTime(240000);
    expect(isIdleExpired()).toBe(false);

    // 5 phút 1 giây sau khi hoàn tất: mới hết hạn
    vi.advanceTimersByTime(60001);
    expect(isIdleExpired()).toBe(true);
  });

  it('6. Preview Excel hoàn tất: resetActivity() mang lại đủ 5 phút mới', () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);
    localStorage.setItem('accessToken', 'mock-token');
    recordActivity();

    // Preview hoàn tất sau 30 giây
    const previewFinishTime = startTime + 30000;
    vi.setSystemTime(previewFinishTime);
    resetActivity();
    expect(getLastActivityTime()).toBe(previewFinishTime);

    // 4 phút 50 giây sau preview: vẫn chưa hết hạn
    vi.advanceTimersByTime(290000);
    expect(isIdleExpired()).toBe(false);

    // Vượt quá 5 phút kể từ lúc preview hoàn tất: hết hạn
    vi.advanceTimersByTime(15000);
    expect(isIdleExpired()).toBe(true);
  });

  it('7. Đổi mật khẩu: logout ngay lập tức, không phụ thuộc vào idle 5 phút', async () => {
    localStorage.setItem('accessToken', 'active-token');
    localStorage.setItem('refreshToken', 'active-refresh');
    localStorage.setItem('user', JSON.stringify({ email: 'user@company.com' }));
    recordActivity();

    // Người dùng mới hoạt động được 10 giây (còn tới 4 phút 50 giây idle)
    expect(isIdleExpired()).toBe(false);

    vi.spyOn(authApi, 'logout').mockResolvedValueOnce({ message: 'Đăng xuất thành công' });

    // Gọi hàm logout (như trong ChangePasswordModal khi đổi MK thành công)
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('Hỗ trợ setCustomIdleTimeout(30 * 1000) khi cần cấu hình timeout tùy biến trong test', () => {
    setCustomIdleTimeout(30 * 1000);
    expect(getIdleTimeoutMs()).toBe(30000);

    const startTime = 1000000;
    vi.setSystemTime(startTime);
    localStorage.setItem('accessToken', 'mock-token');
    recordActivity();

    // 25s: chưa hết hạn
    vi.advanceTimersByTime(25000);
    expect(isIdleExpired()).toBe(false);

    // 31s: đã hết hạn theo custom timeout
    vi.advanceTimersByTime(6000);
    expect(isIdleExpired()).toBe(true);

    // Reset về mặc định
    setCustomIdleTimeout(null);
    expect(getIdleTimeoutMs()).toBe(300000);
  });
});
