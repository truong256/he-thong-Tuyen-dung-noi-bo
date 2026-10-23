import { DomainError } from '../domain/errors.ts';
import { REQUISITION_STATUSES } from '../domain/types.ts';
import type { Actor, RequisitionStatus } from '../domain/types.ts';
import type { RequisitionLifecycleService } from '../service/requisitionLifecycleService.ts';

/**
 * Lớp HTTP không phụ thuộc framework (NestJS/Spring/Express đều gọi được).
 * `actor` do middleware xác thực JWT gắn vào - KHÔNG lấy từ body.
 *
 *   POST /api/requisitions/:id/status   -> changeStatus
 *   GET  /api/requisitions/:id/status-history -> history
 */
export interface HttpRequest {
  actor: Actor | null;
  params: { id: string };
  body?: unknown;
}

export interface HttpResponse {
  status: number;
  body: unknown;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function errorResponse(err: unknown): HttpResponse {
  if (err instanceof DomainError) {
    return {
      status: err.httpStatus,
      body: { error: { code: err.code, message: err.message, details: err.details ?? null } },
    };
  }
  return { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống.', details: null } } };
}

export class RequisitionStatusController {
  private readonly service: RequisitionLifecycleService;

  constructor(service: RequisitionLifecycleService) {
    this.service = service;
  }

  async changeStatus(req: HttpRequest): Promise<HttpResponse> {
    try {
      if (!req.actor) return errorResponse(new DomainError('FORBIDDEN', 'Chưa đăng nhập.'));
      const body = req.body;
      if (!isRecord(body)) throw new DomainError('VALIDATION_ERROR', 'Nội dung yêu cầu không hợp lệ.');

      const target = body['targetStatus'];
      if (typeof target !== 'string' || !(REQUISITION_STATUSES as readonly string[]).includes(target)) {
        throw new DomainError('VALIDATION_ERROR', 'targetStatus không hợp lệ.');
      }
      const reasonCode = body['reasonCode'];
      const note = body['note'];
      if (reasonCode !== undefined && typeof reasonCode !== 'string') {
        throw new DomainError('VALIDATION_ERROR', 'reasonCode phải là chuỗi.');
      }
      if (note !== undefined && typeof note !== 'string') {
        throw new DomainError('VALIDATION_ERROR', 'note phải là chuỗi.');
      }

      const result = await this.service.changeStatus(req.actor, {
        requisitionId: req.params.id,
        targetStatus: target as RequisitionStatus,
        ...(reasonCode !== undefined ? { reasonCode } : {}),
        ...(note !== undefined ? { note } : {}),
        acknowledgePipelineWarning: body['acknowledgePipelineWarning'] === true,
      });
      return { status: 200, body: result };
    } catch (err) {
      return errorResponse(err);
    }
  }

  async history(req: HttpRequest): Promise<HttpResponse> {
    try {
      if (!req.actor) return errorResponse(new DomainError('FORBIDDEN', 'Chưa đăng nhập.'));
      return { status: 200, body: await this.service.getHistory(req.actor, req.params.id) };
    } catch (err) {
      return errorResponse(err);
    }
  }
}
