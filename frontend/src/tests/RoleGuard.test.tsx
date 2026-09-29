import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RoleGuard from '../components/RoleGuard';
import * as useAuthHook from '../hooks/useAuth';

vi.mock('../hooks/useAuth');

describe('RoleGuard Component', () => {
  it('renders children when user has the allowed role', () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: { id: 1, email: 'admin@company.com', fullName: 'Admin', role: 'ADMIN', roles: ['ADMIN'], status: 'ACTIVE' },
      token: 'valid-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasRole: (r: string) => r === 'ADMIN',
      hasAnyRole: (roles: string[]) => roles.includes('ADMIN'),
    });

    render(
      <MemoryRouter>
        <RoleGuard allowedRoles={['ADMIN']}>
          <div>Admin Content Protected</div>
        </RoleGuard>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Content Protected')).toBeInTheDocument();
  });

  it('shows access denied when user does not have allowed role', () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: { id: 2, email: 'candidate@company.com', fullName: 'Candidate', role: 'CANDIDATE', roles: ['CANDIDATE'], status: 'ACTIVE' },
      token: 'valid-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasRole: (r: string) => r === 'CANDIDATE',
      hasAnyRole: () => false,
    });

    render(
      <MemoryRouter>
        <RoleGuard allowedRoles={['ADMIN']}>
          <div>Admin Content Protected</div>
        </RoleGuard>
      </MemoryRouter>
    );

    expect(screen.getByText('Truy cập bị từ chối')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content Protected')).not.toBeInTheDocument();
  });
});
