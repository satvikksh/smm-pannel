import jwt from 'jsonwebtoken';
export interface AccessTokenClaims {
    sub: string;
    role: string;
    jti: string;
    type: 'access';
}
export interface RefreshTokenClaims {
    sub: string;
    role: string;
    jti: string;
    type: 'refresh';
}
export declare function signAccessToken(payload: {
    sub: string;
    role: string;
    jti: string;
    secret: string;
    expiresIn: string;
}): string;
export declare function verifyAccessToken(token: string, secret: string): AccessTokenClaims;
export { jwt };
/** Generate an unguessable opaque token (refresh tokens / session ids). */
export declare function generateOpaqueToken(bytes?: number): string;
/** Hash a token for storage at rest. Refresh tokens are stored hashed. */
export declare function hashToken(token: string): string;
export declare function generateSessionId(): string;
