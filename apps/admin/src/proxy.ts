import { NextResponse, type NextRequest } from 'next/server';
import { subdomainSlugFromHost } from '@smm/types';

/**
 * Server-side tenant gate for the Admin panel.
 *
 * Admin panels are served from per-admin subdomains
 * (`ram-kumar.smmpannel.com` in production, `ram-kumar.localhost` in dev). This
 * proxy resolves the host against the API before any page renders:
 *
 *   - unknown subdomain      → /panel-not-found   ("Admin panel not found.")
 *   - disabled / unlicensed  → /panel-unavailable ("This Admin panel is
 *                              currently unavailable." + license detail)
 *   - valid tenant           → forward `x-admin-subdomain` and continue
 *
 * Apex/localhost access (plain local dev) is left untouched. Infra failures
 * (API unreachable) fail open — the API still enforces auth + tenant isolation
 * on every request, so the panel is never made *less* safe by this gate.
 */
const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost';

function defaultApiBase(): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[admin] The tenant proxy requires API_BASE_URL (server) or NEXT_PUBLIC_API_URL. ' +
        'Set it in the Admin panel Vercel project environment (e.g. https://api.smmpanel.vercel.app).',
    );
  }
  return 'http://localhost:4000';
}

const API_BASE =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  defaultApiBase();

interface TenantResolution {
  found: boolean;
  available: boolean;
  slug: string | null;
  subdomain: string | null;
  reason: string | null;
  detail: string | null;
}

async function resolveTenant(host: string): Promise<TenantResolution | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/tenant/resolve?host=${encodeURIComponent(host)}`,
      { cache: 'no-store', headers: { accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: TenantResolution };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Never gate the gate pages themselves.
  if (pathname.startsWith('/panel-not-found') || pathname.startsWith('/panel-unavailable')) {
    return NextResponse.next();
  }

  const host = request.headers.get('host') ?? '';
  const slug = subdomainSlugFromHost(host, ROOT_DOMAIN);
  if (!slug) return NextResponse.next();

  const resolution = await resolveTenant(host);
  if (!resolution) return NextResponse.next();

  if (!resolution.found) {
    const url = request.nextUrl.clone();
    url.pathname = '/panel-not-found';
    url.search = '';
    return NextResponse.rewrite(url);
  }

  if (!resolution.available) {
    const url = request.nextUrl.clone();
    url.pathname = '/panel-unavailable';
    url.search = '';
    if (resolution.detail) url.searchParams.set('detail', resolution.detail);
    return NextResponse.rewrite(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-admin-subdomain', slug);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'],
};
