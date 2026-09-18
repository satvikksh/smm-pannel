import { buildSubdomainHost, subdomainSlugFromHost } from '@smm/types';

/** Public root domain the admin panels are served under (browser-visible). */
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost';

/**
 * The admin subdomain slug this browser tab is currently on, or `null` when the
 * panel is opened on the apex domain / bare localhost (plain local dev). The
 * value is used to tell the API which tenant this panel belongs to — it never
 * authorizes anything on its own.
 */
export function currentSubdomainSlug(): string | null {
  if (typeof window === 'undefined') return null;
  return subdomainSlugFromHost(window.location.host, ROOT_DOMAIN);
}

/** Full panel host for the current tab, or `null` on apex/localhost. */
export function currentPanelHost(): string | null {
  const slug = currentSubdomainSlug();
  return slug ? buildSubdomainHost(slug, ROOT_DOMAIN) : null;
}
