import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
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
        <LoginForm />
      </BrowserRouter>
    </AuthContext.Provider>
  );
};

describe('LoginForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form without any demo accounts or credentials card', () => {
    renderWithContext();

    expect(screen.getByText('Chào mừng trở lại')).toBeInTheDocument();
    expect(screen.getByLabelText('Email công ty')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();

    // Verify completely purged demo references
    expect(screen.queryByText(/Tài khoản mẫu/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/123456/)).not.toBeInTheDocument();
    expect(screen.queryByText(/admin@company.com/)).not.toBeInTheDocument();
  });

  it('toggles password visibility with text-only button "Hiện" / "Ẩn"', () => {
    renderWithContext();

    const passwordInput = screen.getByLabelText('Mật khẩu') as HTMLInputElement;
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

  it('invokes auth login on form submit with email and password', async () => {
    renderWithContext();

    const emailInput = screen.getByLabelText('Email công ty');
    const passwordInput = screen.getByLabelText('Mật khẩu');
    const submitBtn = screen.getByRole('button', { name: 'Đăng nhập' });

    fireEvent.change(emailInput, { target: { value: 'hr_lead@company.com' } });
    fireEvent.change(passwordInput, { target: { value: 'SecretSecure999@' } });

    fireEvent.click(submitBtn);

    expect(mockLogin).toHaveBeenCalledWith('hr_lead@company.com', 'SecretSecure999@');
  });
});
