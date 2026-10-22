import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { apiClient, triggerSessionExpired, resetSessionExpiredThrottle } from '../api/client';

describe('client.ts Auth & Session Expired Interceptor (S1-02 & Section 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetSessionExpiredThrottle();
  });

  it('does not trigger session expired when login returns 401 (wrong credentials)', async () => {
    const sessionExpiredSpy = vi.fn();
    window.addEventListener('ats:session-expired', sessionExpiredSpy);

    // Mock axios post failure on login
    const loginError = {
      config: { url: '/api/auth/login' },
      response: { status: 401, data: { message: 'Bad credentials' } },
    };

    // Trigger the response error interceptor directly or via apiClient call
    const interceptor = (apiClient.interceptors.response as any).handlers[0];

    await expect(interceptor.rejected(loginError)).rejects.toEqual(loginError);
    expect(sessionExpiredSpy).not.toHaveBeenCalled();

    window.removeEventListener('ats:session-expired', sessionExpiredSpy);
  });

  it('does not trigger session expired when forgot-password returns 401', async () => {
    const sessionExpiredSpy = vi.fn();
    window.addEventListener('ats:session-expired', sessionExpiredSpy);

    const forgotPasswordError = {
      config: { url: '/api/auth/forgot-password' },
      response: { status: 401, data: { message: 'Unauthorized' } },
    };

    const interceptor = (apiClient.interceptors.response as any).handlers[0];

    await expect(interceptor.rejected(forgotPasswordError)).rejects.toEqual(forgotPasswordError);
    expect(sessionExpiredSpy).not.toHaveBeenCalled();

    window.removeEventListener('ats:session-expired', sessionExpiredSpy);
  });

  it('does not trigger session expired on 403 Forbidden (handled by RoleGuard)', async () => {
    const sessionExpiredSpy = vi.fn();
    window.addEventListener('ats:session-expired', sessionExpiredSpy);

    const forbiddenError = {
      config: { url: '/api/users/admin-only' },
      response: { status: 403, data: { message: 'Forbidden' } },
    };

    const interceptor = (apiClient.interceptors.response as any).handlers[0];

    await expect(interceptor.rejected(forbiddenError)).rejects.toEqual(forbiddenError);
    expect(sessionExpiredSpy).not.toHaveBeenCalled();

    window.removeEventListener('ats:session-expired', sessionExpiredSpy);
  });

  it('triggers session expired on protected route 401 when no refreshToken is found', async () => {
    const sessionExpiredSpy = vi.fn();
    window.addEventListener('ats:session-expired', sessionExpiredSpy);

    const unauthError = {
      config: { url: '/api/users/me', headers: {} },
      response: { status: 401, data: { message: 'Token expired' } },
    };

    const interceptor = (apiClient.interceptors.response as any).handlers[0];

    await expect(interceptor.rejected(unauthError)).rejects.toEqual(unauthError);
    expect(sessionExpiredSpy).toHaveBeenCalledTimes(1);

    window.removeEventListener('ats:session-expired', sessionExpiredSpy);
  });

  it('attempts refresh token and handles refresh failure with session expired', async () => {
    localStorage.setItem('refreshToken', 'mock-expired-refresh-token');

    const sessionExpiredSpy = vi.fn();
    window.addEventListener('ats:session-expired', sessionExpiredSpy);

    vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('Refresh failed'));

    const unauthError = {
      config: { url: '/api/users/me', headers: {} },
      response: { status: 401, data: { message: 'Token expired' } },
    };

    const interceptor = (apiClient.interceptors.response as any).handlers[0];

    await expect(interceptor.rejected(unauthError)).rejects.toThrow('Refresh failed');
    expect(sessionExpiredSpy).toHaveBeenCalled();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();

    window.removeEventListener('ats:session-expired', sessionExpiredSpy);
  });

  it('throttles triggerSessionExpired to prevent infinite loops and modal spam', () => {
    const sessionExpiredSpy = vi.fn();
    window.addEventListener('ats:session-expired', sessionExpiredSpy);

    triggerSessionExpired();
    triggerSessionExpired();
    triggerSessionExpired();

    expect(sessionExpiredSpy).toHaveBeenCalledTimes(1);

    window.removeEventListener('ats:session-expired', sessionExpiredSpy);
  });

  it('does not trigger session expired when reset-password returns 401', async () => {
    const sessionExpiredSpy = vi.fn();
    window.addEventListener('ats:session-expired', sessionExpiredSpy);

    const resetPasswordError = {
      config: { url: '/api/auth/reset-password' },
      response: { status: 401, data: { message: 'Invalid token' } },
    };

    const interceptor = (apiClient.interceptors.response as any).handlers[0];

    await expect(interceptor.rejected(resetPasswordError)).rejects.toEqual(resetPasswordError);
    expect(sessionExpiredSpy).not.toHaveBeenCalled();

    window.removeEventListener('ats:session-expired', sessionExpiredSpy);
  });

  it('calls refresh endpoint on 401 protected request and updates tokens', async () => {
    localStorage.setItem('refreshToken', 'initial-refresh-token');

    const axiosPostSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        accessToken: 'brand-new-access-token',
        refreshToken: 'brand-new-refresh-token',
      },
    });

    const originalRequest: any = {
      url: '/api/users/me',
      headers: {},
      adapter: async () => ({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      }),
    };

    const interceptor = (apiClient.interceptors.response as any).handlers[0];
    await interceptor.rejected({
      config: originalRequest,
      response: { status: 401 },
    });

    expect(axiosPostSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/refresh-token'),
      { refreshToken: 'initial-refresh-token' }
    );
    expect(localStorage.getItem('accessToken')).toBe('brand-new-access-token');
    expect(localStorage.getItem('refreshToken')).toBe('brand-new-refresh-token');
  });

  it('triggers only 1 refresh call when multiple concurrent requests receive 401', async () => {
    localStorage.setItem('refreshToken', 'initial-refresh-token');

    let resolveRefreshPromise: any;
    const refreshPromise = new Promise((resolve) => {
      resolveRefreshPromise = resolve;
    });

    const axiosPostSpy = vi.spyOn(axios, 'post').mockImplementation(() => refreshPromise as any);

    const interceptor = (apiClient.interceptors.response as any).handlers[0];

    const req1 = {
      url: '/api/users/me',
      headers: {},
      adapter: async () => ({
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      }),
    };
    const req2 = {
      url: '/api/salary-ranges',
      headers: {},
      adapter: async () => ({
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      }),
    };

    // Trigger both 401s concurrently
    const p1 = interceptor.rejected({ config: req1, response: { status: 401 } });
    const p2 = interceptor.rejected({ config: req2, response: { status: 401 } });

    expect(axiosPostSpy).toHaveBeenCalledTimes(1);

    // Resolve refresh
    resolveRefreshPromise({
      data: {
        accessToken: 'concurrent-access-token',
        refreshToken: 'concurrent-refresh-token',
      },
    });

    await Promise.allSettled([p1, p2]);
    expect(axiosPostSpy).toHaveBeenCalledTimes(1);
  });
});
