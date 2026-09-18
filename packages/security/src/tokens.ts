import { createHash, randomBytes } from 'node:crypto';
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

export function signAccessToken(payload: {
  sub: string;
  role: string;
  jti: string;
  secret: string;
  expiresIn: string;
}): string {
  const claims: AccessTokenClaims = { sub: payload.sub, role: payload.role, jti: payload.jti, type: 'access' };
  return jwt.sign(claims, payload.secret, {
    expiresIn: payload.expiresIn as jwt.SignOptions['expiresIn'],
    audience: 'smm-panel',
    issuer: 'smm-panel-api',
  });
}

export function verifyAccessToken(token: string, secret: string): AccessTokenClaims {
  const decoded = jwt.verify(token, secret, { audience: 'smm-panel', issuer: 'smm-panel-api' }) as jwt.JwtPayload;
  if (decoded.type !== 'access') {
    throw new jwt.JsonWebTokenError('Not an access token');
  }
  return {
    sub: String(decoded.sub ?? ''),
    role: String(decoded.role ?? ''),
    jti: String(decoded.jti ?? ''),
    type: 'access',
  };
}

export { jwt };

/** Generate an unguessable opaque token (refresh tokens / session ids). */
export function generateOpaqueToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}

/** Hash a token for storage at rest. Refresh tokens are stored hashed. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateSessionId(): string {
  return randomBytes(24).toString('hex');
}