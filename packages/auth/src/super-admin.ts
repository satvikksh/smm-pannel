import { createHash, timingSafeEqual } from 'node:crypto';
import { getEnvironment } from '@smm/config';

/**
 * Super Admin credentials are owned exclusively by the server-side root
 * environment (`SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`). They are the
 * single source of truth for Super Admin authentication, are never stored in
 * the database for verification, and are never exposed to the browser.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const left = createHash('sha256').update(a, 'utf8').digest();
  const right = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(left, right);
}

/** True only when both the email and password match the environment exactly. */
export function verifySuperAdminCredentials(email: string, password: string): boolean {
  const expectedEmail = getEnvironment().superAdminEmail.trim().toLowerCase();
  const expectedPassword = getEnvironment().superAdminPassword;
  const emailOk = constantTimeEqual(email.trim().toLowerCase(), expectedEmail);
  const passwordOk = constantTimeEqual(password, expectedPassword);
  return emailOk && passwordOk;
}

/** True when `email` is the configured Super Admin email (any portal). */
export function isSuperAdminEmail(email: string): boolean {
  const expectedEmail = getEnvironment().superAdminEmail.trim().toLowerCase();
  return constantTimeEqual(email.trim().toLowerCase(), expectedEmail);
}
