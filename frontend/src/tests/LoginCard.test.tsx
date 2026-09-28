import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginCard } from '../components/auth/LoginCard';
import { AuthContext } from '../contexts/AuthContext';

const mockLogin = vi.fn();
const mockLogout = vi.fn();

const renderWithContext = () => {
  return render(
    <AuthContext.Provider
      value={{
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        login: mockLogin,
        logout: mockLogout,
        refreshUser: vi.fn(),
        hasRole: () => false,
        hasAnyRole: () => false,
      }}
    >
      <BrowserRouter>
        <LoginCard />
      </BrowserRouter>
    </AuthContext.Provider>
  );
};

describe('LoginCard Neumorphic Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders soft neumorphic login card with HR badge and without demo credentials', () => {
    renderWithContext();

    expect(screen.getByText('HR')).toBeInTheDocument();
    expect(screen.getByText('Chào mừng trở lại')).toBeInTheDocument();
    expect(screen.getByText('Đăng nhập để tiếp tục')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email công ty')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mật khẩu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();

    // Verify completely purged demo references
    expect(screen.queryByText(/Tài khoản mẫu/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/123456/)).not.toBeInTheDocument();
    expect(screen.queryByText(/admin@company.com/)).not.toBeInTheDocument();
  });

  it('toggles password visibility with text-only button "Hiện" / "Ẩn"', () => {
    renderWithContext();

    const passwordInput = screen.getByPlaceholderText('Mật khẩu') as HTMLInputElement;
    const toggleBtn = screen.getByRole('button', { name: /Hiện mật khẩu/i });

    expect(passwordInput.type).toBe('password');
    expect(toggleBtn.textContent).toBe('Hiện');

    fireEvent.click(toggleBtn);

    expect(passwordInput.type).toBe('text');
    expect(toggleBtn.textContent).toBe('Ẩn');

    fireEvent.click(toggleBtn);

    expect(passwordInput.type).toBe('password');
    expect(toggleBtn.textContent).toBe('Hiện');
  });

  it('validates required fields before calling login API', async () => {
    renderWithContext();

    const submitBtn = screen.getByRole('button', { name: 'Đăng nhập' });

    // Submit with empty inputs
    fireEvent.click(submitBtn);

    expect(screen.getByText('Vui lòng nhập email.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('invokes auth login on form submit with valid email and password', async () => {
    renderWithContext();

    const emailInput = screen.getByPlaceholderText('Email công ty');
    const passwordInput = screen.getByPlaceholderText('Mật khẩu');
    const submitBtn = screen.getByRole('button', { name: 'Đăng nhập' });

    fireEvent.change(emailInput, { target: { value: 'hr_lead@company.com' } });
    fireEvent.change(passwordInput, { target: { value: 'SecretSecure999@' } });

    fireEvent.click(submitBtn);

    expect(mockLogin).toHaveBeenCalledWith('hr_lead@company.com', 'SecretSecure999@');
  });
});
