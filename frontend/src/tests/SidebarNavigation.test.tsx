import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../layouts/Sidebar';
import * as useAuthHook from '../hooks/useAuth';

vi.mock('../hooks/useAuth');

describe('Sidebar Role Navigation & Mobile Drawer (S1-06)', () => {
  it('renders Admin menu when user has ADMIN role', () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: { id: 1, email: 'admin@ats.com', fullName: 'System Admin', role: 'ADMIN', roles: ['ADMIN'], status: 'ACTIVE' },
      token: 'valid-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      permissions: ['USER_READ', 'USER_MANAGE', 'ROLE_READ', 'ROLE_MANAGE', 'CATALOG_READ', 'CATALOG_MANAGE', 'SALARY_READ', 'SALARY_MANAGE'],
      hasRole: (r: string) => r === 'ADMIN',
      hasAnyRole: (roles: string[]) => roles.includes('ADMIN'),
      hasPermission: (p: string) => ['USER_READ', 'USER_MANAGE', 'ROLE_READ', 'ROLE_MANAGE', 'CATALOG_READ', 'CATALOG_MANAGE', 'SALARY_READ', 'SALARY_MANAGE'].includes(p),
      hasAnyPermission: (perms: string[]) => perms.some(p => ['USER_READ', 'USER_MANAGE', 'ROLE_READ', 'ROLE_MANAGE', 'CATALOG_READ', 'CATALOG_MANAGE', 'SALARY_READ', 'SALARY_MANAGE'].includes(p)),
    });

    render(
      <MemoryRouter>
        <Sidebar isOpen={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('Tổng quan')).toBeInTheDocument();
    expect(screen.getByText('Quản lý Tài khoản')).toBeInTheDocument();
    expect(screen.getByText('Nhập nhân sự Excel')).toBeInTheDocument();
    expect(screen.getByText('Khung Năng lực')).toBeInTheDocument();
    expect(screen.getByText('Ngân hàng Câu hỏi')).toBeInTheDocument();
    expect(screen.getByText('Tin tuyển dụng')).toBeInTheDocument();
    expect(screen.queryByText('Hồ sơ & CV của tôi')).not.toBeInTheDocument();
  });

  it('renders Candidate menu only when user is CANDIDATE', () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: { id: 2, email: 'cand@ats.com', fullName: 'Candidate User', role: 'CANDIDATE', roles: ['CANDIDATE'], status: 'ACTIVE' },
      token: 'valid-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      permissions: ['APPLICATION_CREATE', 'CANDIDATE_READ_OWN'],
      hasRole: (r: string) => r === 'CANDIDATE',
      hasAnyRole: () => false,
      hasPermission: (p: string) => ['APPLICATION_CREATE', 'CANDIDATE_READ_OWN'].includes(p),
      hasAnyPermission: (perms: string[]) => perms.some(p => ['APPLICATION_CREATE', 'CANDIDATE_READ_OWN'].includes(p)),
    });

    render(
      <MemoryRouter>
        <Sidebar isOpen={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('Tổng quan')).toBeInTheDocument();
    expect(screen.getByText('Việc làm đang mở')).toBeInTheDocument();
    expect(screen.getByText('Hồ sơ & CV của tôi')).toBeInTheDocument();
    expect(screen.queryByText('Quản lý Tài khoản')).not.toBeInTheDocument();
  });

  it('triggers onClose when clicking close button in mobile drawer', () => {
    const handleClose = vi.fn();
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: { id: 1, email: 'admin@ats.com', fullName: 'Admin', role: 'ADMIN', roles: ['ADMIN'], status: 'ACTIVE' },
      token: 'valid-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      permissions: ['USER_READ', 'USER_MANAGE'],
      hasRole: () => true,
      hasAnyRole: () => true,
      hasPermission: () => true,
      hasAnyPermission: () => true,
    });

    render(
      <MemoryRouter>
        <Sidebar isOpen={true} onClose={handleClose} />
      </MemoryRouter>
    );

    const closeBtn = screen.getByLabelText('Đóng menu');
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders Recruiter menu with direct link to Candidate Pipeline (/recruitment/candidates)', () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: { id: 3, email: 'recruiter@ats.com', fullName: 'Recruiter User', role: 'RECRUITER', roles: ['RECRUITER'], status: 'ACTIVE' },
      token: 'valid-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      permissions: ['REQUISITION_READ_ASSIGNED', 'JOB_POSTING_MANAGE', 'CANDIDATE_READ_ASSIGNED', 'PIPELINE_MANAGE'],
      hasRole: (r: string) => r === 'RECRUITER',
      hasAnyRole: (roles: string[]) => roles.includes('RECRUITER'),
      hasPermission: (p: string) => ['REQUISITION_READ_ASSIGNED', 'JOB_POSTING_MANAGE', 'CANDIDATE_READ_ASSIGNED', 'PIPELINE_MANAGE'].includes(p),
      hasAnyPermission: (perms: string[]) => perms.some(p => ['REQUISITION_READ_ASSIGNED', 'JOB_POSTING_MANAGE', 'CANDIDATE_READ_ASSIGNED', 'PIPELINE_MANAGE'].includes(p)),
    });

    render(
      <MemoryRouter>
        <Sidebar isOpen={false} />
      </MemoryRouter>
    );

    const pipelineLink = screen.getByText('Hồ sơ & Pipeline').closest('a');
    expect(pipelineLink).toBeInTheDocument();
    expect(pipelineLink).toHaveAttribute('href', '/recruitment/candidates');
  });

  it('renders Approver menu with direct link to Candidate Approvals (/recruitment/approvals)', () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: { id: 4, email: 'approver@ats.com', fullName: 'Approver User', role: 'APPROVER', roles: ['APPROVER'], status: 'ACTIVE' },
      token: 'valid-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      permissions: ['REQUISITION_APPROVE', 'CANDIDATE_READ_ALL'],
      hasRole: (r: string) => r === 'APPROVER',
      hasAnyRole: (roles: string[]) => roles.includes('APPROVER'),
      hasPermission: (p: string) => ['REQUISITION_APPROVE', 'CANDIDATE_READ_ALL'].includes(p),
      hasAnyPermission: (perms: string[]) => perms.some(p => ['REQUISITION_APPROVE', 'CANDIDATE_READ_ALL'].includes(p)),
    });

    render(
      <MemoryRouter>
        <Sidebar isOpen={false} />
      </MemoryRouter>
    );

    const approvalsLink = screen.getByText('Duyệt ứng viên & Offer').closest('a');
    expect(approvalsLink).toBeInTheDocument();
    expect(approvalsLink).toHaveAttribute('href', '/recruitment/approvals');
  });
});

