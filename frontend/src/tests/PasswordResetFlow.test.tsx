import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import apiClient from '../api/client';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';

const genericMessage = 'Nếu tài khoản tồn tại và đã cấu hình email khôi phục, liên kết đặt lại mật khẩu sẽ được gửi đến email đã đăng ký.';

function renderReset(path = '/reset-password?token=test-only-token') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<div>Trang đăng nhập</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillPasswords() {
  fireEvent.change(screen.getByLabelText(/^Mật khẩu mới/), { target: { value: 'NewSecret123@' } });
  fireEvent.change(screen.getByLabelText(/^Xác nhận mật khẩu mới/), { target: { value: 'NewSecret123@' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đặt lại mật khẩu' }));
}

describe('S1-03 password reset API flows', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it.each(['admin@company.com', 'existing@company.com', 'missing@company.com'])('shows the same response for %s', async (email) => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { message: genericMessage } });
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText(/^Email công ty/), { target: { value: ` ${email} ` } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu khôi phục' }));

    expect(await screen.findByRole('status')).toHaveTextContent(genericMessage);
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/auth/forgot-password', { email });
    expect(screen.queryByText(/test-only-token/)).not.toBeInTheDocument();
    expect(screen.queryByText(/smtp/i)).not.toBeInTheDocument();
  });


  it('rejects invalid email before calling the API', () => {
    const post = vi.spyOn(apiClient, 'post');
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/^Email công ty/), { target: { value: 'invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu khôi phục' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Địa chỉ email không đúng định dạng.');
    expect(post).not.toHaveBeenCalled();
  });

  it('does not expose email existence or transport details on a failed request', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('SMTP diagnostic with secret'));
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/^Email công ty/), { target: { value: 'existing@company.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu khôi phục' }));
    expect(await screen.findByRole('status')).toHaveTextContent(genericMessage);
    expect(screen.queryByText(/SMTP diagnostic/)).not.toBeInTheDocument();
  });

  it('submits the emailed token through the real API wrapper and returns to login', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { message: 'Đặt lại mật khẩu thành công.' } });
    renderReset();
    fillPasswords();

    expect(await screen.findByRole('alert')).toHaveTextContent('Đặt lại mật khẩu thành công.');
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/auth/reset-password', {
      token: 'test-only-token', newPassword: 'NewSecret123@', confirmPassword: 'NewSecret123@',
    });
    await waitFor(() => expect(screen.getByText('Trang đăng nhập')).toBeInTheDocument(), { timeout: 3000 });
  });

  it.each(['expired', 'used'])('keeps the user on the reset page when the token is %s', async (tokenKind) => {
    const message = 'Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng.';
    const post = vi.spyOn(apiClient, 'post').mockRejectedValue({ response: { status: 400, data: { message } } });
    renderReset(`/reset-password?token=${tokenKind}-test-token`);
    fillPasswords();

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/api/auth/reset-password', {
      token: `${tokenKind}-test-token`, newPassword: 'NewSecret123@', confirmPassword: 'NewSecret123@',
    });
    expect(screen.getByTestId('reset-password-page')).toBeInTheDocument();
    expect(screen.queryByText('Trang đăng nhập')).not.toBeInTheDocument();
  });

  it('does not call reset API without a token', async () => {
    const post = vi.spyOn(apiClient, 'post');
    renderReset('/reset-password');
    fillPasswords();
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng cung cấp mã token');
    expect(post).not.toHaveBeenCalled();
  });
});
