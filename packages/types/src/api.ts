export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'LICENSE_INVALID'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL';

export interface ApiErrorPayload {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiMessageResponse {
  data: { message: string };
}

export const API_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY: 429,
  UNAVAILABLE: 503,
  INTERNAL: 500,
} as const;

const FRIENDLY_MESSAGES: Record<number, string> = {
  400: 'The request was invalid. Please check the details and try again.',
  401: 'Your session has expired. Please login again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'An account or license with this information already exists.',
  422: 'Some of the submitted information is invalid.',
  429: 'Too many attempts. Please wait a moment and try again.',
  500: 'Server error. Please try again.',
};

export function friendlyMessage(status: number, serverMessage?: string): string {
  return serverMessage && serverMessage.trim().length > 0
    ? serverMessage
    : FRIENDLY_MESSAGES[status] ?? 'Something went wrong. Please try again.';
}

export interface RequestMeta {
  ip: string;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly details?: Record<string, string[]>;

  constructor(status: number, code: ApiErrorCode, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Bad request', details?: Record<string, string[]>): ApiError {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'You do not have permission to perform this action'): ApiError {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string, details?: Record<string, string[]>): ApiError {
    return new ApiError(409, 'CONFLICT', message, details);
  }
  static validation(message = 'Validation failed', details?: Record<string, string[]>): ApiError {
    return new ApiError(422, 'VALIDATION_ERROR', message, details);
  }
  static licenseInvalid(message = 'License is not valid'): ApiError {
    return new ApiError(403, 'LICENSE_INVALID', message);
  }
  static internal(message = 'Server error'): ApiError {
    return new ApiError(500, 'INTERNAL', message);
  }
  static serviceUnavailable(message = 'The service is temporarily unavailable'): ApiError {
    return new ApiError(503, 'SERVICE_UNAVAILABLE', message);
  }
}
