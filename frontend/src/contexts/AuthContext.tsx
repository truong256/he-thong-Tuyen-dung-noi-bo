import React, { createContext, useEffect, useState } from 'react';
import { UserSummary } from '../types/auth';
import authApi from '../api/auth';

interface AuthContextType {
  user: UserSummary | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummary | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('accessToken'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
      localStorage.setItem('user', JSON.stringify(me));
    } catch {
      // If fetching me fails, keep current state or logout if unauthorized
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        if (storedToken === 'mock-admin-token') {
          const saved = localStorage.getItem('user');
          if (saved) {
            setUser(JSON.parse(saved));
          }
        } else {
          try {
            const me = await authApi.getMe();
            setUser(me);
            localStorage.setItem('user', JSON.stringify(me));
          } catch (err: any) {
            if (err.response?.status === 401 || err.response?.status === 403) {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              setUser(null);
              setToken(null);
            }
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();

    const handleSessionExpired = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('ats:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('ats:session-expired', handleSessionExpired);
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await authApi.login(email, pass);
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    setToken(res.accessToken);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      const currentRefreshToken = localStorage.getItem('refreshToken');
      await authApi.logout({
        refreshToken: currentRefreshToken || undefined,
        email: user?.email || undefined,
      });
    } catch {
      // Ignore network error on logout
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      sessionStorage.removeItem('ats:session_expired');
      setUser(null);
      setToken(null);
    }
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
    return userRoles.some((r) => r.toUpperCase() === role.toUpperCase());
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user) return false;
    const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
    return roles.some((targetRole) =>
      userRoles.some((r) => r.toUpperCase() === targetRole.toUpperCase())
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        refreshUser,
        hasRole,
        hasAnyRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
export default AuthContext;
