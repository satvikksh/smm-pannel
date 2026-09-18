import { Router } from 'express';
import { getEnvironment } from '@smm/config';
import { License, User } from '@smm/database';
import { ROLES, subdomainSlugFromHost, type LicenseStatus } from '@smm/types';
import { adminLicenseVerdict } from '@smm/auth';

const NOT_FOUND = 'Admin panel not found.';
const UNAVAILABLE = 'This Admin panel is currently unavailable.';

interface ResolvePayload {
  /** A subdomain-shaped host was supplied that maps to a known admin. */
  found: boolean;
  /** The panel is reachable and the admin's license currently permits access. */
  available: boolean;
  slug: string | null;
  subdomain: string | null;
  adminName: string | null;
  licenseStatus: LicenseStatus | 'missing' | null;
  reason: string | null;
  detail: string | null;
}

function licenseDetail(status: LicenseStatus | 'missing' | null): string | null {
  if (status === 'suspended') return 'License suspended.';
  if (status === 'revoked') return 'License revoked.';
  if (status === 'expired') return 'License expired.';
  return null;
}

/**
 * Public, unauthenticated tenant resolution used by the Admin app's server-side
 * proxy and login page. It answers only "does this host belong to an admin panel
 * and is the panel currently reachable" — never any admin data.
 */
export function tenantRouter(): Router {
  const router = Router();

  router.get('/resolve', async (req, res) => {
    const env = getEnvironment();
    const host = typeof req.query.host === 'string' ? req.query.host : '';
    const slug = subdomainSlugFromHost(host, env.rootDomain);

    const base: ResolvePayload = {
      found: false,
      available: false,
      slug,
      subdomain: null,
      adminName: null,
      licenseStatus: null,
      reason: NOT_FOUND,
      detail: null,
    };

    if (!slug) {
      res.json({ data: base });
      return;
    }

    const admin = await User.findOne({ role: ROLES.ADMIN, subdomainSlug: slug }).lean();
    if (!admin) {
      res.json({ data: base });
      return;
    }

    const payload: ResolvePayload = {
      ...base,
      found: true,
      subdomain: admin.subdomain ?? `${slug}.${env.rootDomain}`,
      adminName: admin.name,
    };

    if (admin.status !== 'active' || admin.subdomainStatus === 'disabled') {
      res.json({ data: { ...payload, reason: UNAVAILABLE } });
      return;
    }

    const license = await License.findOne({ adminUserId: admin._id }).lean();
    const verdict = adminLicenseVerdict(admin, license);
    if (!verdict.valid) {
      const status = license?.status ?? 'missing';
      res.json({
        data: {
          ...payload,
          licenseStatus: status,
          reason: UNAVAILABLE,
          detail: licenseDetail(status),
        },
      });
      return;
    }

    res.json({
      data: {
        ...payload,
        available: true,
        licenseStatus: license?.status ?? null,
        reason: null,
        detail: null,
      },
    });
  });

  return router;
}
