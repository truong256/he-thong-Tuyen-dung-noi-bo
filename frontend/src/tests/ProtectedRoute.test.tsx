import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import * as useAuthHook from '../hooks/useAuth';

vi.mock('../hooks/useAuth');

describe('ProtectedRoute Component', () => {
  it('renders children when user is authenticated', () => {
    vi.spyOn(useAuthHook, 'useAuth').mockReturnValue({
      user: { id: 1, email: 'user@company.com', fullName: 'User', role: 'RECRUITER', roles: ['RECRUITER'], status: 'ACTIVE' },
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
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard View Protected</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard View Protected')).toBeInTheDocument();
  });

  it('redirects to /login when user is unauthenticated', () => {
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
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard View Protected</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page Target</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page Target')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard View Protected')).not.toBeInTheDocument();
  });

  it('redirects with sessionExpired state when sessionStorage marks session as expired', () => {
    sessionStorage.setItem('ats:session_expired', '1');
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

    let testLocation: any;
    const LocationSpy = () => {
      const location = useLocation();
      testLocation = location;
      return <div>Login Page Target</div>;
    };

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard View Protected</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LocationSpy />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page Target')).toBeInTheDocument();
    expect(testLocation?.state?.sessionExpired).toBe(true);
    sessionStorage.removeItem('ats:session_expired');
  });
});
