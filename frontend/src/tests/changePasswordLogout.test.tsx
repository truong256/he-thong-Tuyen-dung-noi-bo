import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { ChangePasswordModal } from '../components/auth/ChangePasswordModal';
import { LoginPage } from '../pages/LoginPage';
import authApi from '../api/auth';
import { resetSessionExpiredThrottle } from '../api/client';

describe('ĐỔI MẬT KHẨU PHẢI ĐĂNG XUẤT (Section 4, 7 - Test D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    resetSessionExpiredThrottle();
  });

  const TestAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const [token, setToken] = useState<string | null>('old-access-token');
    const [user, setUser] = useState<any>({
      id: 1,
      email: 'user@company.com',
      fullName: 'User',
      role: 'RECRUITER',
      status: 'ACTIVE',
    });

    const logout = vi.fn().mockImplementation(async () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setToken(null);
      setUser(null);
    });

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

  it('Test D: Đổi mật khẩu thành công -> revoke session, xóa token/state, redirect /login và hiển thị thông báo đúng', async () => {
    localStorage.setItem('accessToken', 'old-access-token');
    localStorage.setItem('refreshToken', 'old-refresh-token');
    localStorage.setItem('user', JSON.stringify({ email: 'user@company.com' }));

    const mockChangePassword = vi.spyOn(authApi, 'changePassword').mockResolvedValueOnce({
      message: 'Đổi mật khẩu thành công.',
    });

    const onClose = vi.fn();
    const onSuccess = vi.fn();

    const { container } = render(
      <TestAuthProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <div>
                  <ChangePasswordModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />
                </div>
              }
            />
          </Routes>
        </MemoryRouter>
      </TestAuthProvider>
    );

    // 1. Fill current password, new valid password, and confirmation
    const currentInput = container.querySelector<HTMLInputElement>('#currentPassword')!;
    const newInput = container.querySelector<HTMLInputElement>('#newPassword')!;
    const confirmInput = container.querySelector<HTMLInputElement>('#confirmPassword')!;

    expect(currentInput).toBeInTheDocument();
    expect(newInput).toBeInTheDocument();
    expect(confirmInput).toBeInTheDocument();

    fireEvent.change(currentInput, { target: { value: 'OldPassword123@' } });
    fireEvent.change(newInput, { target: { value: 'NewSecretPass999@' } });
    fireEvent.change(confirmInput, { target: { value: 'NewSecretPass999@' } });

    // 2. Click submit button
    const submitBtn = screen.getByRole('button', { name: /Lưu mật khẩu/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    // 3. Verify API was called with exact credentials
    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: 'OldPassword123@',
        newPassword: 'NewSecretPass999@',
        confirmPassword: 'NewSecretPass999@',
      });
    });

    // 4. Verify client storage was purged
    await waitFor(() => {
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    // 5. Verify modal closed
    expect(onClose).toHaveBeenCalled();

    // 6. Verify redirected to /login and displays exact required Vietnamese notification
    await waitFor(() => {
      expect(
        screen.getByText('Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.')
      ).toBeInTheDocument();
    });
  });
});
