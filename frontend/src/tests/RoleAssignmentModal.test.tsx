import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RoleAssignmentModal from '../components/admin/RoleAssignmentModal';
import adminApi from '../api/admin';

vi.mock('../api/admin');

describe('RoleAssignmentModal Component (S1-09)', () => {
  const mockUser = {
    id: 12,
    email: 'admin_test@ats.com',
    fullName: 'Admin Test',
    role: 'ADMIN',
    roles: ['ADMIN'],
    status: 'ACTIVE',
  };

  it('renders current roles and displays role selection options', () => {
    render(
      <RoleAssignmentModal
        isOpen={true}
        user={mockUser}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    expect(screen.getByText('Phân vai trò RBAC')).toBeInTheDocument();
    expect(screen.getByText('admin_test@ats.com')).toBeInTheDocument();
    expect(screen.getByText('Quản trị viên')).toBeInTheDocument();
    expect(screen.getByText('Chuyên viên Tuyển dụng')).toBeInTheDocument();
  });

  it('protects self admin from having ADMIN role unchecked', () => {
    const { container } = render(
      <RoleAssignmentModal
        isOpen={true}
        user={mockUser}
        currentLoggedInUserEmail="admin_test@ats.com"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    expect(screen.getByText(/Bạn đang phân quyền cho chính tài khoản của mình/i)).toBeInTheDocument();
    const adminCheckbox = container.querySelector<HTMLInputElement>('#role-ADMIN');
    expect(adminCheckbox).toBeInTheDocument();
    expect(adminCheckbox).toBeDisabled();
  });

  it('submits updated roles to adminApi.updateRoles', async () => {
    const regularUser = {
      id: 15,
      email: 'recruiter@ats.com',
      fullName: 'Recruiter',
      role: 'RECRUITER',
      roles: ['RECRUITER'],
      status: 'ACTIVE',
    };
    const handleSuccess = vi.fn();
    vi.spyOn(adminApi, 'updateRoles').mockResolvedValue({
      ...regularUser,
      roles: ['RECRUITER', 'INTERVIEWER'],
    });

    render(
      <RoleAssignmentModal
        isOpen={true}
        user={regularUser}
        onClose={vi.fn()}
        onSuccess={handleSuccess}
        onError={vi.fn()}
      />
    );

    // Click on INTERVIEWER option to add role
    const interviewerCard = screen.getByText('Người Phỏng vấn');
    fireEvent.click(interviewerCard);

    // Save
    const submitBtn = screen.getByRole('button', { name: /Lưu vai trò/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminApi.updateRoles).toHaveBeenCalledWith(15, {
        roles: expect.arrayContaining(['RECRUITER', 'INTERVIEWER']),
      });
      expect(handleSuccess).toHaveBeenCalled();
    });
  });
});
