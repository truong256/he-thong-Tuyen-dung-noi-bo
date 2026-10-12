export type ErrorCode =
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INVALID_TRANSITION'
  | 'REASON_REQUIRED'
  | 'INVALID_REASON'
  | 'NOTE_REQUIRED'
  | 'PIPELINE_WARNING'
  | 'CONCURRENT_MODIFICATION'
  | 'UNPUBLISH_FAILED';

const HTTP_STATUS: Record<ErrorCode, number> = {
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  INVALID_TRANSITION: 409,
  REASON_REQUIRED: 422,
  INVALID_REASON: 422,
  NOTE_REQUIRED: 422,
  PIPELINE_WARNING: 409,
  CONCURRENT_MODIFICATION: 409,
  UNPUBLISH_FAILED: 502,
};

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.httpStatus = HTTP_STATUS[code];
    this.details = details;
  }
}
