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

describe('LoginCard Reference UI Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders modern reference card with user avatar and without demo credentials', () => {
    const { container } = renderWithContext();

    expect(container.querySelector('.auth-avatar-circle')).toBeInTheDocument();
    expect(screen.getByText('Chào mừng trở lại')).toBeInTheDocument();
    expect(screen.getByText('Đăng nhập để tiếp tục')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email hoặc tài khoản')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mật khẩu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();

    // Verify completely purged demo references
    expect(screen.queryByText(/Tài khoản mẫu/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/123456/)).not.toBeInTheDocument();
    expect(screen.queryByText(/admin@company.com/)).not.toBeInTheDocument();
    expect(screen.queryByText(/dtc245200851/)).not.toBeInTheDocument();
  });

  it('toggles password visibility with eye icon toggle button', () => {
    renderWithContext();

    const passwordInput = screen.getByPlaceholderText('Mật khẩu') as HTMLInputElement;
    const toggleBtn = screen.getByRole('button', { name: /Hiện mật khẩu/i });

    expect(passwordInput.type).toBe('password');

    fireEvent.click(toggleBtn);

    expect(passwordInput.type).toBe('text');
    expect(screen.getByRole('button', { name: /Ẩn mật khẩu/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ẩn mật khẩu/i }));

    expect(passwordInput.type).toBe('password');
    expect(screen.getByRole('button', { name: /Hiện mật khẩu/i })).toBeInTheDocument();
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

    const emailInput = screen.getByPlaceholderText('Email hoặc tài khoản');
    const passwordInput = screen.getByPlaceholderText('Mật khẩu');
    const submitBtn = screen.getByRole('button', { name: 'Đăng nhập' });

    fireEvent.change(emailInput, { target: { value: 'hr_lead@company.com' } });
    fireEvent.change(passwordInput, { target: { value: 'SecretSecure999@' } });

    fireEvent.click(submitBtn);

    expect(mockLogin).toHaveBeenCalledWith('hr_lead@company.com', 'SecretSecure999@');
  });

  it('displays remaining login attempts badge and message when login fails with 401', async () => {
    mockLogin.mockRejectedValueOnce({
      response: {
        status: 401,
        data: {
          message: 'Email hoặc mật khẩu không chính xác. Bạn còn 3 lần thử trước khi tài khoản bị khóa.',
          remainingAttempts: 3,
        },
      },
    });

    renderWithContext();

    const emailInput = screen.getByPlaceholderText('Email hoặc tài khoản');
    const passwordInput = screen.getByPlaceholderText('Mật khẩu');
    const submitBtn = screen.getByRole('button', { name: 'Đăng nhập' });

    fireEvent.change(emailInput, { target: { value: 'user@company.com' } });
    fireEvent.change(passwordInput, { target: { value: 'WrongPass!' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Bạn còn 3 lần thử trước khi tài khoản bị khóa/i)).toBeInTheDocument();
    expect(screen.getByText(/Số lượt thử còn lại:/i)).toBeInTheDocument();
    expect(screen.getByText(/3 \/ 5/i)).toBeInTheDocument();
  });

  it('displays session expired message when session expired flag is present', () => {
    sessionStorage.setItem('ats:session_expired', '1');
    renderWithContext();
    expect(screen.getByText('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')).toBeInTheDocument();
    expect(sessionStorage.getItem('ats:session_expired')).toBeNull();
  });
});
