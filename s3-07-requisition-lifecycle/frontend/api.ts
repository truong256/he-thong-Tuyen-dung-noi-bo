import type { StatusRequestBody } from './dialogModel.ts';

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ status: number; json(): Promise<unknown> }>;

export type SubmitOutcome =
  | { kind: 'success' }
  | { kind: 'pipeline-warning'; details: unknown }
  | { kind: 'error'; message: string };

const FALLBACK = 'Không thể thực hiện thao tác. Vui lòng thử lại.';

export async function submitStatusChange(
  fetchImpl: FetchLike,
  requisitionId: string,
  body: StatusRequestBody,
  accessToken: string,
): Promise<SubmitOutcome> {
  try {
    const res = await fetchImpl(`/api/requisitions/${encodeURIComponent(requisitionId)}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    if (res.status === 200) return { kind: 'success' };
    const payload = (await res.json().catch(() => null)) as {
      error?: { code?: string; message?: string; details?: unknown };
    } | null;
    if (res.status === 409 && payload?.error?.code === 'PIPELINE_WARNING') {
      return { kind: 'pipeline-warning', details: payload.error.details };
    }
    return { kind: 'error', message: payload?.error?.message ?? FALLBACK };
  } catch {
    return { kind: 'error', message: 'Mất kết nối tới máy chủ. Vui lòng thử lại.' };
  }
}
