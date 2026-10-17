import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import apiClient from '../api/client';
import jobPostingApi from '../api/jobPosting';
import { resetSessionExpiredThrottle } from '../api/client';

const previousAdapter = apiClient.defaults.adapter;

describe('Public careers requests are independent of the internal session', () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear(); resetSessionExpiredThrottle();
  });
  afterEach(() => { apiClient.defaults.adapter = previousAdapter; vi.restoreAllMocks(); });

  it.each(['list', 'detail'])('allows %s with an idle session without sending its JWT', async (kind) => {
    localStorage.setItem('accessToken', 'stale-internal-token');
    localStorage.setItem('ats:last_activity_time', '1');
    const adapter = vi.fn(async (config) => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config }));
    apiClient.defaults.adapter = adapter;
    await (kind === 'list' ? jobPostingApi.listPublic() : jobPostingApi.getPublicDetail(1));
    expect(adapter).toHaveBeenCalledOnce();
    expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBeUndefined();
    expect(localStorage.getItem('accessToken')).toBe('stale-internal-token');
    expect(localStorage.getItem('ats:last_activity_time')).toBe('1');
    expect(sessionStorage.getItem('ats:session_expired')).toBeNull();
  });

  it('does not expire or refresh a session on a public API error', async () => {
    localStorage.setItem('accessToken', 'internal-token');
    localStorage.setItem('ats:last_activity_time', String(Date.now()));
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError('Unavailable', 'ERR_BAD_REQUEST', config, null, {
        data: {}, status: 401, statusText: 'Unauthorized', headers: new AxiosHeaders(), config,
      });
    };
    await expect(jobPostingApi.listPublic()).rejects.toThrow('Unavailable');
    expect(localStorage.getItem('accessToken')).toBe('internal-token');
    expect(sessionStorage.getItem('ats:session_expired')).toBeNull();
  });

  it('still blocks protected management requests after idle expiry', async () => {
    localStorage.setItem('accessToken', 'stale-internal-token');
    localStorage.setItem('ats:last_activity_time', '1');
    const adapter = vi.fn(); apiClient.defaults.adapter = adapter;
    await expect(jobPostingApi.list()).rejects.toBeDefined();
    expect(adapter).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('ats:session_expired')).toBe('1');
  });
});
