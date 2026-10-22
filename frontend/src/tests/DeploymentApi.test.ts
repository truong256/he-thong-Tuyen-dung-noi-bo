import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api/client';
import organizationApi from '../api/organization';
import jobTitleApi from '../api/jobTitle';

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); localStorage.clear(); });

describe('Production API boundaries', () => {
  it('does not fabricate job-title records when the production API fails', async () => {
    vi.stubEnv('PROD', true);
    vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('API offline'));
    await expect(jobTitleApi.getJobTitles()).rejects.toThrow();
  });
  it('loads departments from the API even without a cached token', async () => {
    vi.stubEnv('PROD', true);
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [{ id: 9, name: 'Server department', code: 'SRV' }] });
    expect((await organizationApi.getDepartments())[0].id).toBe(9);
    expect(get).toHaveBeenCalledWith('/api/departments');
  });

  it('rejects local-only locations instead of claiming database persistence', async () => {
    vi.stubEnv('PROD', true);
    await expect(organizationApi.getLocations()).rejects.toThrow();
  });

  it('public listings do not send an old account token', async () => {
    localStorage.setItem('accessToken', 'old-account-token');
    let authorization: unknown;
    await apiClient.get('/api/public/job-postings', { adapter: async config => {
      authorization = config.headers.Authorization;
      return { data: { content: [] }, status: 200, statusText: 'OK', headers: {}, config };
    }});
    expect(authorization).toBeUndefined();
  });
});
