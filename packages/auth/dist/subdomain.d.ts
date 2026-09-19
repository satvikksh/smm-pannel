import { isValidSubdomainSlug, subdomainSlugFromHost, type SubdomainStatus } from '@smm/types';
export { subdomainSlugFromHost, isValidSubdomainSlug };
/**
 * Pick the next free slug for `base`, derived from the admin name:
 * `ram-kumar`, then `ram-kumar-2`, `ram-kumar-3`, … Never returns a slug that
 * is already owned by another admin. The unique partial index on
 * `User.subdomainSlug` is the hard guarantee; a concurrent race surfaces as a
 * duplicate-key error and the caller may retry with a fresh candidate.
 */
export declare function generateUniqueSubdomainSlug(base: string): Promise<string>;
export interface SubdomainAssignment {
    subdomainSlug: string;
    subdomain: string;
    subdomainStatus: SubdomainStatus;
    subdomainCreatedAt: Date;
}
/** Build (without persisting) a fresh subdomain assignment for an admin name. */
export declare function buildSubdomainAssignment(adminName: string): Promise<SubdomainAssignment>;
/** The host currently configured for an admin (recomputed from the live env). */
export declare function subdomainHostForSlug(slug: string): string;
/**
 * Enforce that a request arriving on a specific admin subdomain is being made
 * by that same admin. The check only applies when a subdomain is supplied
 * (i.e. the panel is served from `{slug}.{rootDomain}`); apex/localhost access
 * keeps working. Never trust the hostname alone — the caller passes the
 * authenticated account's slug.
 */
export declare function assertAdminSubdomainMatches(admin: {
    subdomainSlug?: string | null;
    subdomainStatus?: string | null;
}, requestedSlug: string | null | undefined): void;
