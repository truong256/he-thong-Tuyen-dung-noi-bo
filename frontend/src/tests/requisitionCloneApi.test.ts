import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requisitionApi } from '../api/requisition';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => {
  const client = { post: vi.fn(), get: vi.fn() };
  return { default: client, apiClient: client };
});

const copy = { id: 201, requisitionCode: 'TEST-CLONE', status: 'DRAFT', salaryMin: 0,
  proposedMinSalary: 900, candidateRequirements: '', requirements: 'legacy',
  neededDate: '2027-02-01', targetDate: '2027-01-01' };

describe('S3-05 clone API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserves independently supplied dates, zero salary and empty canonical requirements', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: copy });
    const result = await requisitionApi.clone(101);
    expect(result.neededDate).toBe('2027-02-01');
    expect(result.targetDate).toBe('2027-01-01');
    expect(result.salaryMin).toBe(0);
    expect(result.candidateRequirements).toBe('');
    // The management editor consumes these legacy aliases first.
    expect(result).toMatchObject({ proposedMinSalary: 0, requirements: '' });
  });

  it('keeps canonical dates and cleared requirements when reloading the cloned draft', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: copy });
    const reloaded = await requisitionApi.getById(copy.id);
    expect(reloaded.targetDate).toBe('2027-01-01');
    expect(reloaded.neededDate).toBe('2027-02-01');
    expect(reloaded.candidateRequirements).toBe('');
    expect(reloaded.requirements).toBe('');
  });

  it('coalesces overlapping clone requests for the same source', async () => {
    let resolve!: (value: { data: typeof copy }) => void;
    vi.mocked(apiClient.post).mockReturnValue(new Promise(r => { resolve = r; }));
    const first = requisitionApi.clone(102);
    const second = requisitionApi.clone(102);
    const calls = vi.mocked(apiClient.post).mock.calls.length;
    resolve({ data: copy });
    expect(await first).toEqual(await second);
    expect(calls).toBe(1);
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ...copy, id: 202 } });
    expect((await requisitionApi.clone(102)).id).toBe(202);
  });

  it('allows retry after a rejected request and does not block a different source', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('network'));
    await expect(requisitionApi.clone(103)).rejects.toThrow('network');
    vi.mocked(apiClient.post).mockResolvedValue({ data: copy });
    await Promise.all([requisitionApi.clone(103), requisitionApi.clone(104)]);
    expect(apiClient.post).toHaveBeenCalledTimes(3);
  });
});
