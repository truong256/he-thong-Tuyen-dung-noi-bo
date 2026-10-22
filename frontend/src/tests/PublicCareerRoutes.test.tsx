import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { useAuth } from '../hooks/useAuth';

vi.mock('../contexts/AuthContext', () => ({ AuthProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('../hooks/useAuth');
vi.mock('../api/jobPosting', () => ({ default: {
  listPublic: vi.fn(async () => ({ content: [], totalElements: 0 })),
  getPublicDepartments: vi.fn(async () => []),
  getPublicDetail: vi.fn(async () => ({ id: 1, jobCode: 'JP-2026-0001', title: 'Kỹ sư Java công khai' })),
} }));

describe('Real application public routes and candidate management guard', () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, email: 'candidate@company.com', fullName: 'Ứng viên', roles: ['CANDIDATE'], role: 'CANDIDATE', status: 'ACTIVE' },
      token: 'candidate-token', isAuthenticated: true, isLoading: false,
      permissions: ['PROFILE_READ'], hasRole: role => role === 'CANDIDATE',
      hasAnyRole: roles => roles.includes('CANDIDATE'), hasPermission: () => false,
      hasAnyPermission: () => false, login: vi.fn(), logout: vi.fn(), refreshUser: vi.fn(),
    });
  });

  it.each(['/careers', '/jobs'])('allows a guest to open %s without the login guard', async (path) => {
    vi.mocked(useAuth).mockReturnValue({ ...useAuth(), user: null, token: null, isAuthenticated: false });
    window.history.replaceState({}, '', path);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Các vị trí đang mở tuyển (0)' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/careers');
  });

  it.each([true, false])('allows public detail with authenticated=%s', async (authenticated) => {
    vi.mocked(useAuth).mockReturnValue({ ...useAuth(), isAuthenticated: authenticated });
    window.history.replaceState({}, '', '/careers/1');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Kỹ sư Java công khai' })).toBeInTheDocument();
    expect(screen.getByText('JP-2026-0001')).toBeInTheDocument();
  });

  it('blocks a candidate who navigates directly to job management', async () => {
    window.history.replaceState({}, '', '/recruitment/job-postings');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Không đủ quyền truy cập' })).toBeInTheDocument();
    expect(screen.getByText('403', { exact: true })).toBeInTheDocument();
  });
});
