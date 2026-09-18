import { getEnvironment } from '@smm/config';
import { User } from '@smm/database';
import {
  ApiError,
  buildSubdomainHost,
  isValidSubdomainSlug,
  slugifySubdomainSlug,
  subdomainSlugFromHost,
  type SubdomainStatus,
} from '@smm/types';

export { subdomainSlugFromHost, isValidSubdomainSlug };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pick the next free slug for `base`, derived from the admin name:
 * `ram-kumar`, then `ram-kumar-2`, `ram-kumar-3`, … Never returns a slug that
 * is already owned by another admin. The unique partial index on
 * `User.subdomainSlug` is the hard guarantee; a concurrent race surfaces as a
 * duplicate-key error and the caller may retry with a fresh candidate.
 */
export async function generateUniqueSubdomainSlug(base: string): Promise<string> {
  const candidate = slugifySubdomainSlug(base) || 'admin';
  const escaped = escapeRegExp(candidate);
  const existing = await User.find(
    { role: 'admin', subdomainSlug: { $regex: `^${escaped}(-[0-9]+)?$` } },
    { subdomainSlug: 1 },
  ).lean();
  const taken = new Set(existing.map((u) => u.subdomainSlug));
  if (!taken.has(candidate)) return candidate;
  let n = 2;
  while (taken.has(`${candidate}-${n}`)) n += 1;
  return `${candidate}-${n}`;
}

export interface SubdomainAssignment {
  subdomainSlug: string;
  subdomain: string;
  subdomainStatus: SubdomainStatus;
  subdomainCreatedAt: Date;
}

/** Build (without persisting) a fresh subdomain assignment for an admin name. */
export async function buildSubdomainAssignment(adminName: string): Promise<SubdomainAssignment> {
  const env = getEnvironment();
  const slug = await generateUniqueSubdomainSlug(adminName);
  return {
    subdomainSlug: slug,
    subdomain: buildSubdomainHost(slug, env.rootDomain),
    subdomainStatus: 'active',
    subdomainCreatedAt: new Date(),
  };
}

/** The host currently configured for an admin (recomputed from the live env). */
export function subdomainHostForSlug(slug: string): string {
  return buildSubdomainHost(slug, getEnvironment().rootDomain);
}

/**
 * Enforce that a request arriving on a specific admin subdomain is being made
 * by that same admin. The check only applies when a subdomain is supplied
 * (i.e. the panel is served from `{slug}.{rootDomain}`); apex/localhost access
 * keeps working. Never trust the hostname alone — the caller passes the
 * authenticated account's slug.
 */
export function assertAdminSubdomainMatches(
  admin: { subdomainSlug?: string | null; subdomainStatus?: string | null },
  requestedSlug: string | null | undefined,
): void {
  if (!requestedSlug) return;
  if (!admin.subdomainSlug || admin.subdomainSlug !== requestedSlug) {
    throw ApiError.forbidden(
      'This Admin panel belongs to a different account. Sign in with the admin account that owns this panel URL.',
    );
  }
  if (admin.subdomainStatus === 'disabled') {
    throw ApiError.forbidden('This Admin panel is currently unavailable.');
  }
}
