/**
 * Pure subdomain helpers shared by the API and the Admin application.
 * Every rule here is deliberately small and testable — no DB access.
 */

/** Max length of a subdomain slug segment (before the root domain). */
export const SUBDOMAIN_SLUG_MAX_LENGTH = 50;

export const SUBDOMAIN_STATUSES = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
} as const;

export type SubdomainStatus = (typeof SUBDOMAIN_STATUSES)[keyof typeof SUBDOMAIN_STATUSES];

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

/**
 * Normalise an admin name (or arbitrary text) into a safe subdomain slug.
 * Lowercase, keeps `a-z 0-9 -`, treats any other character run as a separator,
 * collapses separators and trims leading/trailing dashes.
 */
export function slugifySubdomainSlug(value: string): string {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.slice(0, SUBDOMAIN_SLUG_MAX_LENGTH);
}

export function isValidSubdomainSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= SUBDOMAIN_SLUG_MAX_LENGTH && SLUG_RE.test(slug);
}

/** Build the full panel host, e.g. `ram-kumar` + `smmpannel.com` → `ram-kumar.smmpannel.com`. */
export function buildSubdomainHost(slug: string, rootDomain: string): string {
  return `${slug}.${rootDomain}`;
}

/** Strip a `:port` suffix from a host header value. */
export function hostNameOnly(host: string): string {
  const trimmed = host.trim().toLowerCase();
  const lastColon = trimmed.lastIndexOf(':');
  // Only treat `:digits` at the end as a port.
  if (lastColon > 0 && /^\d+$/.test(trimmed.slice(lastColon + 1))) {
    return trimmed.slice(0, lastColon);
  }
  return trimmed;
}

/**
 * Extract the subdomain slug for an admin app request.
 *
 * Given the `Host` header and the configured root domain, returns the slug when
 * the host is a valid subdomain of the root domain, and `null` otherwise (the
 * apex host or localhost). Never trusts the hostname alone for authorization —
 * callers must combine the result with the authenticated admin identity.
 */
export function subdomainSlugFromHost(host: string, rootDomain: string): string | null {
  const hostname = hostNameOnly(host);
  if (!hostname || hostname === rootDomain) return null;
  const suffix = `.${rootDomain}`;
  if (!hostname.endsWith(suffix)) return null;
  const slug = hostname.slice(0, -suffix.length);
  return isValidSubdomainSlug(slug) ? slug : null;
}