import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LockAccountModal from '../components/admin/LockAccountModal';
import adminApi from '../api/admin';

vi.mock('../api/admin');

describe('LockAccountModal Component (S1-10)', () => {
  const mockUser = {
    id: 5,
    email: 'testuser@ats.com',
    fullName: 'Test User',
    role: 'RECRUITER',
    roles: ['RECRUITER'],
    status: 'ACTIVE',
  };

  it('renders lock confirmation dialog with reason selector for active user', () => {
    render(
      <LockAccountModal
        isOpen={true}
        user={mockUser}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    expect(screen.getByText('Xác nhận Khóa tài khoản')).toBeInTheDocument();
    expect(screen.getByText('testuser@ats.com')).toBeInTheDocument();
    expect(screen.getByLabelText(/Lý do khóa tài khoản/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Khóa tài khoản/i })).toBeInTheDocument();
  });

  it('renders unlock confirmation dialog for locked user', () => {
    const lockedUser = { ...mockUser, status: 'LOCKED' };
    render(
      <LockAccountModal
        isOpen={true}
        user={lockedUser}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    expect(screen.getByText('Xác nhận Mở khóa tài khoản')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mở khóa tài khoản/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Lý do khóa tài khoản/i)).not.toBeInTheDocument();
  });

  it('calls adminApi.updateStatus when submitting lock form', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();
    vi.spyOn(adminApi, 'updateStatus').mockResolvedValue({ ...mockUser, status: 'LOCKED' });

    render(
      <LockAccountModal
        isOpen={true}
        user={mockUser}
        onClose={handleClose}
        onSuccess={handleSuccess}
        onError={vi.fn()}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Khóa tài khoản/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminApi.updateStatus).toHaveBeenCalledWith(5, expect.objectContaining({
        status: 'LOCKED',
        reason: expect.any(String),
      }));
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('blocks lock submission and shows error when reason is Khác and note is empty', async () => {
    const updateSpy = vi.spyOn(adminApi, 'updateStatus');
    updateSpy.mockClear();

    render(
      <LockAccountModal
        isOpen={true}
        user={mockUser}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    // Select reason 'Khác (ghi rõ trong ghi chú)'
    const select = screen.getByLabelText(/Lý do khóa tài khoản/i);
    fireEvent.change(select, { target: { value: 'Khác (ghi rõ trong ghi chú)' } });

    // Label should now reflect mandatory note
    expect(screen.getByText(/Ghi chú chi tiết lý do khóa/i)).toBeInTheDocument();

    // Click submit without entering note
    const submitBtn = screen.getByRole('button', { name: /Khóa tài khoản/i });
    fireEvent.click(submitBtn);

    // Validation error should appear
    expect(screen.getByText('Vui lòng ghi rõ lý do trong phần ghi chú khi chọn lý do khác.')).toBeInTheDocument();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('submits successfully when reason is Khác and valid note is provided', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();
    vi.spyOn(adminApi, 'updateStatus').mockResolvedValue({ ...mockUser, status: 'LOCKED' });

    render(
      <LockAccountModal
        isOpen={true}
        user={mockUser}
        onClose={handleClose}
        onSuccess={handleSuccess}
        onError={vi.fn()}
      />
    );

    // Select reason 'Khác (ghi rõ trong ghi chú)'
    const select = screen.getByLabelText(/Lý do khóa tài khoản/i);
    fireEvent.change(select, { target: { value: 'Khác (ghi rõ trong ghi chú)' } });

    // Type valid note
    const textarea = screen.getByPlaceholderText(/Bắt buộc nhập lý do chi tiết khi chọn lý do khác/i);
    fireEvent.change(textarea, { target: { value: 'Nghỉ việc không báo trước' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Khóa tài khoản/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminApi.updateStatus).toHaveBeenCalledWith(5, expect.objectContaining({
        status: 'LOCKED',
        reason: 'Khác (ghi rõ trong ghi chú)',
        note: 'Nghỉ việc không báo trước',
      }));
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
