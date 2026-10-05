import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import FirstLoginChangePasswordPage from '../pages/FirstLoginChangePasswordPage';
import * as useAuthHook from '../hooks/useAuth';
import authApi from '../api/auth';

vi.mock('../hooks/useAuth');
vi.mock('../api/auth');

describe('First Login Mandatory Password Change Flow', () => {
  const mockLogout = vi.fn().mockResolvedValue(undefined);
  const mockLogin = vi.fn();
  const mockRefreshUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('ProtectedRoute redirects to /first-login/change-password if user.mustChangePassword is true', () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: {
        id: 99,
        email: 'newuser@company.com',
        fullName: 'New User',
        role: 'RECRUITER',
        roles: ['RECRUITER'],
        status: 'ACTIVE',
        mustChangePassword: true,
      },
      token: 'temp-jwt-token',
      isAuthenticated: true,
      isLoading: false,
      login: mockLogin,
      logout: mockLogout,
      refreshUser: mockRefreshUser,
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard View Protected</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/first-login/change-password"
            element={<div>First Login Change Password Screen</div>}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('First Login Change Password Screen')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard View Protected')).not.toBeInTheDocument();
  });

  it('ProtectedRoute redirects to /dashboard if user.mustChangePassword is false and accesses /first-login/change-password', () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'admin@company.com',
        fullName: 'Admin',
        role: 'ADMIN',
        roles: ['ADMIN'],
        status: 'ACTIVE',
        mustChangePassword: false,
      },
      token: 'normal-jwt-token',
      isAuthenticated: true,
      isLoading: false,
      login: mockLogin,
      logout: mockLogout,
      refreshUser: mockRefreshUser,
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/first-login/change-password']}>
        <Routes>
          <Route
            path="/first-login/change-password"
            element={
              <ProtectedRoute>
                <div>First Login Change Password Screen</div>
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard" element={<div>Dashboard View Normal</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard View Normal')).toBeInTheDocument();
    expect(screen.queryByText('First Login Change Password Screen')).not.toBeInTheDocument();
  });

  it('renders FirstLoginChangePasswordPage with required fields and user info', () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: {
        id: 10,
        email: 'staff@company.com',
        fullName: 'Staff Member',
        role: 'RECRUITER',
        roles: ['RECRUITER'],
        status: 'ACTIVE',
        mustChangePassword: true,
      },
      token: 'jwt-token',
      isAuthenticated: true,
      isLoading: false,
      login: mockLogin,
      logout: mockLogout,
      refreshUser: mockRefreshUser,
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/first-login/change-password']}>
        <FirstLoginChangePasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Đổi mật khẩu lần đầu')).toBeInTheDocument();
    expect(screen.getByText(/staff@company\.com/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mật khẩu tạm thời/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Mật khẩu mới/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Xác nhận mật khẩu mới/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đổi mật khẩu' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Đăng xuất/i })).toBeInTheDocument();
  });

  it('submits changePassword and redirects to /login on success', async () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: {
        id: 10,
        email: 'staff@company.com',
        fullName: 'Staff Member',
        role: 'RECRUITER',
        roles: ['RECRUITER'],
        status: 'ACTIVE',
        mustChangePassword: true,
      },
      token: 'jwt-token',
      isAuthenticated: true,
      isLoading: false,
      login: mockLogin,
      logout: mockLogout,
      refreshUser: mockRefreshUser,
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
    });

    vi.spyOn(authApi, 'changePassword').mockResolvedValue({
      message: 'Đổi mật khẩu thành công.',
    });

    render(
      <MemoryRouter initialEntries={['/first-login/change-password']}>
        <Routes>
          <Route
            path="/first-login/change-password"
            element={<FirstLoginChangePasswordPage />}
          />
          <Route path="/login" element={<div>Redirected Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Mật khẩu tạm thời/i), {
      target: { value: 'Temp123456!' },
    });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu mới/i), {
      target: { value: 'NewSecurePass2026!' },
    });
    fireEvent.change(screen.getByLabelText(/Xác nhận mật khẩu mới/i), {
      target: { value: 'NewSecurePass2026!' },
    });

    const submitBtn = screen.getByRole('button', { name: 'Đổi mật khẩu' });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authApi.changePassword).toHaveBeenCalledWith({
        currentPassword: 'Temp123456!',
        newPassword: 'NewSecurePass2026!',
        confirmPassword: 'NewSecurePass2026!',
      });
      expect(mockLogout).toHaveBeenCalledWith(true);
      expect(screen.getByText('Redirected Login Page')).toBeInTheDocument();
      expect(sessionStorage.getItem('ats:auth_notice')).toContain('Đổi mật khẩu thành công!');
    });
  });

  it('allows user to logout from first login change password screen', async () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: {
        id: 10,
        email: 'staff@company.com',
        fullName: 'Staff Member',
        role: 'RECRUITER',
        roles: ['RECRUITER'],
        status: 'ACTIVE',
        mustChangePassword: true,
      },
      token: 'jwt-token',
      isAuthenticated: true,
      isLoading: false,
      login: mockLogin,
      logout: mockLogout,
      refreshUser: mockRefreshUser,
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/first-login/change-password']}>
        <Routes>
          <Route
            path="/first-login/change-password"
            element={<FirstLoginChangePasswordPage />}
          />
          <Route path="/login" element={<div>Login Screen After Logout</div>} />
        </Routes>
      </MemoryRouter>
    );

    const logoutBtn = screen.getByRole('button', { name: /Đăng xuất/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(screen.getByText('Login Screen After Logout')).toBeInTheDocument();
    });
  });
});
