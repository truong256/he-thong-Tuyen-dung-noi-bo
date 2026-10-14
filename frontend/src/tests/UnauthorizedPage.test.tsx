import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import * as useAuthHook from '../hooks/useAuth';

vi.mock('../hooks/useAuth');

describe('UnauthorizedPage Component (S1-07)', () => {
  it('renders 403 forbidden state with clear Vietnamese copy', () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: { id: 10, email: 'user@ats.com', fullName: 'Regular User', role: 'CANDIDATE', roles: ['CANDIDATE'], status: 'ACTIVE' },
      token: 'valid-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
    });

    render(
      <MemoryRouter>
        <UnauthorizedPage statusCode={403} />
      </MemoryRouter>
    );

    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.getByText('Không đủ quyền truy cập')).toBeInTheDocument();
    expect(screen.getByText('Truy cập bị từ chối')).toBeInTheDocument();
    expect(screen.getByText(/Tài khoản của bạn không có quyền truy cập vào chức năng này/i)).toBeInTheDocument();
    expect(screen.getByText('Về trang chủ')).toBeInTheDocument();
    expect(screen.getByText('Quay lại')).toBeInTheDocument();
  });

  it('renders 401 unauthenticated state with login button', () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasRole: vi.fn(),
      hasAnyRole: vi.fn(),
    });

    render(
      <MemoryRouter>
        <UnauthorizedPage statusCode={401} />
      </MemoryRouter>
    );

    expect(screen.getByText('401')).toBeInTheDocument();
    expect(screen.getByText('Chưa xác thực danh tính')).toBeInTheDocument();
    expect(screen.getByText('Đăng nhập lại')).toBeInTheDocument();
  });
});
