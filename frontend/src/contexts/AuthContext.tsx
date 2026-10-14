import React, { createContext, useEffect, useState, useCallback } from 'react';
import { UserSummary } from '../types/auth';
import authApi from '../api/auth';
import { isIdleExpired, recordActivity, clearActivity } from '../utils/idleTracker';
import { triggerIdleSessionExpired } from '../api/client';

export interface AuthContextType {
  user: UserSummary | null;
  token: string | null;
  /** Server-authoritative permission list for current user (S1-05) */
  permissions?: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<UserSummary>;
  logout: (skipServerRevoke?: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser?: (updatedUser: UserSummary) => void;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  /** S1-05: Check if current user has a specific server-granted permission */
  hasPermission?: (permission: string) => boolean;
  hasAnyPermission?: (perms: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummary | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('accessToken'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [permissions, setPermissions] = useState<string[]>(() => {
    const saved = localStorage.getItem('ats:permissions');
    return saved ? JSON.parse(saved) : [];
  });

  const updateUser = useCallback((updatedUser: UserSummary) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  const refreshUser = async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
      localStorage.setItem('user', JSON.stringify(me));
      // Re-fetch permissions on user refresh
      try {
        const perms = await authApi.getPermissions();
        setPermissions(perms);
        localStorage.setItem('ats:permissions', JSON.stringify(perms));
      } catch {
        // Keep existing permissions if fetch fails
      }
    } catch {
      // If fetching me fails, keep current state or logout if unauthorized
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        if (isIdleExpired()) {
          triggerIdleSessionExpired();
          setUser(null);
          setToken(null);
          setPermissions([]);
          setIsLoading(false);
          return;
        }

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
            // Fetch server-authoritative permissions (S1-05)
            try {
              const perms = await authApi.getPermissions();
              setPermissions(perms);
              localStorage.setItem('ats:permissions', JSON.stringify(perms));
            } catch {
              // Use cached permissions if server unavailable
            }
          } catch (err: any) {
            if (err?.response?.status === 401 || err?.response?.status === 403 || !err?.response) {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              localStorage.removeItem('ats:permissions');
              localStorage.removeItem('ats_job_titles');
              clearActivity();
              setUser(null);
              setToken(null);
              setPermissions([]);
            }
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();

    const handleSessionExpired = () => {
      clearActivity();
      setUser(null);
      setToken(null);
      setPermissions([]);
      localStorage.removeItem('ats:permissions');
      localStorage.removeItem('ats_job_titles');
    };

    window.addEventListener('ats:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('ats:session-expired', handleSessionExpired);
    };
  }, []);

  const logout = useCallback(async (skipServerRevoke: boolean = false) => {
    if (!skipServerRevoke) {
      try {
        const currentRefreshToken = localStorage.getItem('refreshToken');
        await authApi.logout({
          refreshToken: currentRefreshToken || undefined,
          email: user?.email || undefined,
        });
      } catch {
        // Ignore network error on logout
      }
    }
    clearActivity();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('ats:permissions');
    localStorage.removeItem('ats_job_titles');
    sessionStorage.removeItem('ats:session_expired');
    setUser(null);
    setToken(null);
    setPermissions([]);
  }, [user]);

  // Global user activity monitor and idle action blocker
  useEffect(() => {
    if (!token || !user) return;

    const handleUserInteractionCapture = (event: Event) => {
      if (!localStorage.getItem('accessToken')) return;

      if (isIdleExpired()) {
        // Block action completely to prevent any protected data access or navigation
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        triggerIdleSessionExpired();
        logout();
        return;
      }

      // Valid activity resets the idle timer
      recordActivity();
    };

    // Attach in capture phase so it runs before any React onClick or router Link navigation
    document.addEventListener('click', handleUserInteractionCapture, true);
    document.addEventListener('keydown', handleUserInteractionCapture, true);
    document.addEventListener('touchstart', handleUserInteractionCapture, true);

    return () => {
      document.removeEventListener('click', handleUserInteractionCapture, true);
      document.removeEventListener('keydown', handleUserInteractionCapture, true);
      document.removeEventListener('touchstart', handleUserInteractionCapture, true);
    };
  }, [token, user, logout]);

  const login = async (email: string, pass: string): Promise<UserSummary> => {
    localStorage.removeItem('ats_job_titles');
    const res = await authApi.login(email, pass);
    localStorage.setItem('accessToken', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('user', JSON.stringify(res.user));
    recordActivity();
    setToken(res.accessToken);
    setUser(res.user);
    // Fetch permissions immediately after login
    try {
      const perms = await authApi.getPermissions();
      setPermissions(perms);
      localStorage.setItem('ats:permissions', JSON.stringify(perms));
    } catch {
      setPermissions([]);
    }
    return res.user;
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

  /**
   * S1-05: Check if the current user has a specific server-granted permission.
   * Permission list is fetched from the server and cached.
   * This is UI-layer only. Backend @PreAuthorize is the real enforcement.
   */
  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    return perms.some((p) => permissions.includes(p));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        permissions,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        refreshUser,
        updateUser,
        hasRole,
        hasAnyRole,
        hasPermission,
        hasAnyPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
export default AuthContext;
