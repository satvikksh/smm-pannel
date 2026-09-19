export type ApiErrorCode = 'VALIDATION_ERROR' | 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'LICENSE_INVALID' | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE' | 'INTERNAL';
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
    data: {
        message: string;
    };
}
export declare const API_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE: 422;
    readonly TOO_MANY: 429;
    readonly UNAVAILABLE: 503;
    readonly INTERNAL: 500;
};
export declare function friendlyMessage(status: number, serverMessage?: string): string;
export interface RequestMeta {
    ip: string;
}
export declare class ApiError extends Error {
    readonly status: number;
    readonly code: ApiErrorCode;
    readonly details?: Record<string, string[]>;
    constructor(status: number, code: ApiErrorCode, message: string, details?: Record<string, string[]>);
    static badRequest(message?: string, details?: Record<string, string[]>): ApiError;
    static unauthorized(message?: string): ApiError;
    static forbidden(message?: string): ApiError;
    static notFound(message?: string): ApiError;
    static conflict(message: string, details?: Record<string, string[]>): ApiError;
    static validation(message?: string, details?: Record<string, string[]>): ApiError;
    static licenseInvalid(message?: string): ApiError;
    static internal(message?: string): ApiError;
    static serviceUnavailable(message?: string): ApiError;
}
