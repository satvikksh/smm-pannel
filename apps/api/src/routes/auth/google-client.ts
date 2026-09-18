/**
 * Server-side Google OAuth client for the USER panel only.
 *
 * The browser never contacts Google directly: the API exchanges the
 * authorization code and fetches the identity from Google. Everything here
 * runs server-side with the client secret, so the secret can never reach the
 * frontend.
 *
 * All functions fail closed — any unexpected response shape is treated as a
 * failed Google authentication.
 */

export interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  id_token?: string;
  scope?: string;
  expires_in?: number;
}

/** Identity data claimed by Google's userinfo endpoint. */
export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

/** Claims returned by the userinfo endpoint that tie the identity to our OAuth
 * client (audience `aud` and authorized party `azp`). */
export interface GoogleIdentityClaims {
  iss?: string;
  aud?: unknown;
  azp?: unknown;
  sub?: string;
}

export class GoogleOAuthError extends Error {
  constructor(message = 'Google authentication failed') {
    super(message);
    this.name = 'GoogleOAuthError';
  }
}

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';

/** Allowable issuers per Google's OpenID Connect discovery document. */
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

function audienceMatches(aud: unknown, clientId: string): boolean {
  if (aud === clientId) return true;
  if (Array.isArray(aud)) return aud.includes(clientId);
  return false;
}

function authorizedPartyMatches(azp: unknown, clientId: string): boolean {
  return typeof azp === 'undefined' || azp === null || azp === clientId;
}

/**
 * Validate issuer + audience + authorized-party claims for a given client id.
 * Used for both the id_token from the token endpoint and the userinfo claims.
 * Fails closed on any mismatch.
 *
 * `requireIssuer` should be true for the id_token (which always carries `iss`)
 * and false for the userinfo endpoint, which does not reliably include `iss`.
 */
export function validateGoogleIdentity(
  claims: GoogleIdentityClaims,
  clientId: string,
  opts: { requireIssuer?: boolean } = {},
): void {
  const iss = typeof claims.iss === 'string' ? claims.iss : '';
  if (opts.requireIssuer && !GOOGLE_ISSUERS.has(iss)) {
    throw new GoogleOAuthError('Google identity was issued by an unexpected issuer.');
  }
  if (iss.length > 0 && !GOOGLE_ISSUERS.has(iss)) {
    throw new GoogleOAuthError('Google identity was issued by an unexpected issuer.');
  }
  if (!audienceMatches(claims.aud, clientId) || !authorizedPartyMatches(claims.azp, clientId)) {
    throw new GoogleOAuthError('Google identity was not issued for this application.');
  }
}

/**
 * Decode the payload segment of a Google id_token (JWT) without verifying the
 * signature. We still verify the issuer/audience/sub against the aud+azp that
 * Google's protected userinfo endpoint returns for the SAME exchange, so the
 * values cannot be forged by an attacker. The token arrives from the token
 * endpoint over HTTPS as part of the protected code exchange.
 */
export function decodeGoogleIdToken(idToken: string): GoogleIdentityClaims {
  const segments = idToken.split('.');
  if (segments.length !== 3) {
    throw new GoogleOAuthError('Google returned a malformed id_token.');
  }
  let payload: unknown;
  try {
    const base64 = (segments[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    payload = JSON.parse(json);
  } catch {
    throw new GoogleOAuthError('Google returned an unreadable id_token.');
  }
  const claims = payload as GoogleIdentityClaims;
  if (typeof claims.sub !== 'string' || claims.sub.length === 0) {
    throw new GoogleOAuthError('Google id_token is missing the user id.');
  }
  return claims;
}

/** Exchange a one-time authorization code for an access token. */
export async function exchangeGoogleCode(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: 'authorization_code',
  });

  let response: Response;
  try {
    response = await globalThis.fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch {
    throw new GoogleOAuthError('Unable to reach the Google token endpoint.');
  }

  if (!response.ok) {
    throw new GoogleOAuthError('Google rejected the authorization code.');
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new GoogleOAuthError('Google returned an unreadable token response.');
  }

  const token = json as Partial<GoogleTokenResponse>;
  if (
    typeof token.access_token !== 'string' ||
    token.access_token.length === 0 ||
    token.token_type !== 'Bearer'
  ) {
    throw new GoogleOAuthError('Google token response was missing the access token.');
  }
  return {
    access_token: token.access_token,
    token_type: token.token_type,
    id_token: typeof token.id_token === 'string' ? token.id_token : undefined,
  };
}

/**
 * Fetch the verified identity for an access token, together with the
 * audience/authorized-party claims that prove the token belongs to our client.
 */
export async function fetchGoogleUserInfo(
  accessToken: string,
): Promise<{ profile: GoogleUserInfo; claims: GoogleIdentityClaims }> {
  let response: Response;
  try {
    response = await globalThis.fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new GoogleOAuthError('Unable to reach the Google identity endpoint.');
  }

  if (!response.ok) {
    throw new GoogleOAuthError('Google rejected the access token.');
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new GoogleOAuthError('Google returned an unreadable identity response.');
  }

  const raw = json as Record<string, unknown>;
  const sub = typeof raw.sub === 'string' ? raw.sub : '';
  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  if (!sub || !email) {
    throw new GoogleOAuthError('Google identity is missing the user or email.');
  }

  const profile: GoogleUserInfo = {
    sub,
    email,
    email_verified: raw.email_verified === true,
    name: typeof raw.name === 'string' && raw.name.trim().length > 0 ? raw.name.trim() : undefined,
    picture:
      typeof raw.picture === 'string' && raw.picture.trim().length > 0 ? raw.picture.trim() : undefined,
  };

  const claims: GoogleIdentityClaims = {
    iss: typeof raw.iss === 'string' ? raw.iss : undefined,
    aud: raw.aud,
    azp: raw.azp,
    sub,
  };
  return { profile, claims };
}