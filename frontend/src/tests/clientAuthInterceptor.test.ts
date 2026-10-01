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
});
