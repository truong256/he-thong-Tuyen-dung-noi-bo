import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WithdrawApplicationPage from '../pages/WithdrawApplicationPage';
import withdrawalApi from '../api/withdrawal';

vi.mock('../api/withdrawal', () => ({
  default: {
    validateToken: vi.fn(),
    confirmWithdrawal: vi.fn(),
    withdrawByCandidate: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('SCRUM-182: WithdrawApplicationPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithToken = (token: string) => {
    return render(
      <MemoryRouter initialEntries={[`/candidate/withdraw?token=${token}`]}>
        <Routes>
          <Route path="/candidate/withdraw" element={<WithdrawApplicationPage />} />
          <Route path="/careers" element={<div>Trang việc làm công khai</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('1. Hiển thị đúng thông tin hồ sơ và vị trí ứng tuyển khi token hợp lệ', async () => {
    vi.mocked(withdrawalApi.validateToken).mockResolvedValueOnce({
      valid: true,
      applicationId: 101,
      candidateName: 'Nguyễn Văn A',
      positionTitle: 'Senior Fullstack Engineer',
      departmentName: 'Kỹ thuật Công nghệ',
      requisitionCode: 'REQ-2026-001',
      alreadyWithdrawn: false,
    });

    renderWithToken('valid-token-123');

    // Loading should appear initially
    expect(screen.getByTestId('withdrawal-loading')).toBeInTheDocument();

    // After resolution, title and candidate details should be rendered
    expect(await screen.findByRole('heading', { name: 'Xác nhận rút hồ sơ ứng tuyển' })).toBeInTheDocument();
    expect(screen.getByTestId('position-title')).toHaveTextContent('Senior Fullstack Engineer');
    expect(screen.getByTestId('candidate-name')).toHaveTextContent('Nguyễn Văn A');
    expect(screen.getByTestId('application-id')).toHaveTextContent('#101');
    expect(screen.getByText('Kỹ thuật Công nghệ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xác nhận rút hồ sơ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeInTheDocument();
  });

  it('2. Nút Hủy quay về trang an toàn và tuyệt đối không gọi API thay đổi trạng thái', async () => {
    vi.mocked(withdrawalApi.validateToken).mockResolvedValueOnce({
      valid: true,
      applicationId: 102,
      candidateName: 'Trần Thị B',
      positionTitle: 'Product Manager',
      alreadyWithdrawn: false,
    });

    renderWithToken('valid-token-cancel');

    expect(await screen.findByRole('heading', { name: 'Xác nhận rút hồ sơ ứng tuyển' })).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: 'Hủy' });
    fireEvent.click(cancelButton);

    // Navigated to /careers safely
    expect(mockNavigate).toHaveBeenCalledWith('/careers');
    // Confirm API was NEVER called
    expect(withdrawalApi.confirmWithdrawal).not.toHaveBeenCalled();
  });

  it('3. Xác nhận rút hồ sơ gửi đúng token và lý do đến backend', async () => {
    vi.mocked(withdrawalApi.validateToken).mockResolvedValueOnce({
      valid: true,
      applicationId: 103,
      candidateName: 'Lê Văn C',
      positionTitle: 'Backend Developer',
      alreadyWithdrawn: false,
    });

    vi.mocked(withdrawalApi.confirmWithdrawal).mockResolvedValueOnce({
      success: true,
      message: 'Rút hồ sơ thành công',
      stage: 'WITHDRAWN',
      applicationId: 103,
    });

    renderWithToken('valid-token-confirm');

    expect(await screen.findByRole('heading', { name: 'Xác nhận rút hồ sơ ứng tuyển' })).toBeInTheDocument();

    // Input optional reason
    const reasonInput = screen.getByPlaceholderText(/đã nhận việc nơi khác/i);
    fireEvent.change(reasonInput, { target: { value: 'Đã nhận offer từ công ty khác' } });

    const confirmButton = screen.getByTestId('btn-confirm-withdrawal');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(withdrawalApi.confirmWithdrawal).toHaveBeenCalledWith({
        token: 'valid-token-confirm',
        reason: 'Đã nhận offer từ công ty khác',
      });
    });

    // Success screen should be rendered
    expect(await screen.findByRole('heading', { name: 'Rút hồ sơ ứng tuyển thành công' })).toBeInTheDocument();
    expect(screen.getByText(/được chuyển sang trạng thái/i)).toBeInTheDocument();
  });

  it('4. Nút xác nhận bị vô hiệu hóa khi đang xử lý để ngăn chặn gửi nhiều lần', async () => {
    let resolveConfirm: (val: any) => void = () => {};
    const confirmPromise = new Promise((resolve) => {
      resolveConfirm = resolve;
    });

    vi.mocked(withdrawalApi.validateToken).mockResolvedValueOnce({
      valid: true,
      applicationId: 104,
      positionTitle: 'DevOps Engineer',
      alreadyWithdrawn: false,
    });
    vi.mocked(withdrawalApi.confirmWithdrawal).mockReturnValueOnce(confirmPromise as any);

    renderWithToken('valid-token-submitting');

    expect(await screen.findByRole('heading', { name: 'Xác nhận rút hồ sơ ứng tuyển' })).toBeInTheDocument();

    const confirmButton = screen.getByTestId('btn-confirm-withdrawal');
    fireEvent.click(confirmButton);

    // Button should be disabled with loading text while request is in flight
    expect(confirmButton).toBeDisabled();
    expect(screen.getByText('Đang xử lý...')).toBeInTheDocument();

    // Clicking again should not invoke confirmWithdrawal a second time
    fireEvent.click(confirmButton);
    expect(withdrawalApi.confirmWithdrawal).toHaveBeenCalledTimes(1);

    // Complete the call
    resolveConfirm({
      success: true,
      message: 'Rút hồ sơ thành công',
      stage: 'WITHDRAWN',
    });

    expect(await screen.findByRole('heading', { name: 'Rút hồ sơ ứng tuyển thành công' })).toBeInTheDocument();
  });

  it('5. Hiển thị thông báo thân thiện khi token hết hạn hoặc không hợp lệ', async () => {
    vi.mocked(withdrawalApi.validateToken).mockResolvedValueOnce({
      valid: false,
      message: 'Mã xác thực rút hồ sơ đã hết hạn. Vui lòng liên hệ bộ phận nhân sự.',
    });

    renderWithToken('expired-token');

    expect(await screen.findByRole('heading', { name: 'Liên kết không hợp lệ' })).toBeInTheDocument();
    expect(screen.getByText('Mã xác thực rút hồ sơ đã hết hạn. Vui lòng liên hệ bộ phận nhân sự.')).toBeInTheDocument();
    // Confirm and Cancel buttons should NOT be displayed
    expect(screen.queryByTestId('btn-confirm-withdrawal')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Về trang tuyển dụng/i })).toBeInTheDocument();
  });

  it('6. Hiển thị thông báo khi không có token trên query params', async () => {
    render(
      <MemoryRouter initialEntries={['/candidate/withdraw']}>
        <Routes>
          <Route path="/candidate/withdraw" element={<WithdrawApplicationPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Liên kết không hợp lệ' })).toBeInTheDocument();
    expect(screen.getByText(/Không tìm thấy mã liên kết rút hồ sơ/i)).toBeInTheDocument();
    expect(withdrawalApi.validateToken).not.toHaveBeenCalled();
  });

  it('7. Hiển thị đúng trạng thái khi hồ sơ đã được rút trước đó', async () => {
    vi.mocked(withdrawalApi.validateToken).mockResolvedValueOnce({
      valid: false,
      alreadyWithdrawn: true,
      positionTitle: 'Frontend Engineer',
      candidateName: 'Hoàng Văn D',
      applicationId: 105,
      message: 'Hồ sơ đã được rút trước đó.',
    });

    renderWithToken('already-withdrawn-token');

    expect(await screen.findByRole('heading', { name: 'Hồ sơ đã được rút' })).toBeInTheDocument();
    expect(screen.getByText(/Hồ sơ của bạn cho vị trí/i)).toBeInTheDocument();
    expect(screen.getAllByText('Frontend Engineer').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId('btn-confirm-withdrawal')).not.toBeInTheDocument();
  });

  it('8. Màn hình hoạt động responsive với các container class cho layout 360px', async () => {
    vi.mocked(withdrawalApi.validateToken).mockResolvedValueOnce({
      valid: true,
      applicationId: 106,
      positionTitle: 'Mobile Developer',
      candidateName: 'Vũ Thị E',
      alreadyWithdrawn: false,
    });

    const { container } = renderWithToken('token-responsive');

    expect(await screen.findByRole('heading', { name: 'Xác nhận rút hồ sơ ứng tuyển' })).toBeInTheDocument();

    const pageContainer = container.querySelector('.withdraw-page-container');
    const card = container.querySelector('.withdraw-card');
    const actions = container.querySelector('.withdraw-actions');

    expect(pageContainer).toBeInTheDocument();
    expect(card).toBeInTheDocument();
    expect(actions).toBeInTheDocument();
  });
});
