/**
 * Pure subdomain helpers shared by the API and the Admin application.
 * Every rule here is deliberately small and testable — no DB access.
 */
/** Max length of a subdomain slug segment (before the root domain). */
export declare const SUBDOMAIN_SLUG_MAX_LENGTH = 50;
export declare const SUBDOMAIN_STATUSES: {
    readonly ACTIVE: "active";
    readonly DISABLED: "disabled";
};
export type SubdomainStatus = (typeof SUBDOMAIN_STATUSES)[keyof typeof SUBDOMAIN_STATUSES];
/**
 * Normalise an admin name (or arbitrary text) into a safe subdomain slug.
 * Lowercase, keeps `a-z 0-9 -`, treats any other character run as a separator,
 * collapses separators and trims leading/trailing dashes.
 */
export declare function slugifySubdomainSlug(value: string): string;
export declare function isValidSubdomainSlug(slug: string): boolean;
/** Build the full panel host, e.g. `ram-kumar` + `smmpannel.com` → `ram-kumar.smmpannel.com`. */
export declare function buildSubdomainHost(slug: string, rootDomain: string): string;
/** Strip a `:port` suffix from a host header value. */
export declare function hostNameOnly(host: string): string;
/**
 * Extract the subdomain slug for an admin app request.
 *
 * Given the `Host` header and the configured root domain, returns the slug when
 * the host is a valid subdomain of the root domain, and `null` otherwise (the
 * apex host or localhost). Never trusts the hostname alone for authorization —
 * callers must combine the result with the authenticated admin identity.
 */
export declare function subdomainSlugFromHost(host: string, rootDomain: string): string | null;
