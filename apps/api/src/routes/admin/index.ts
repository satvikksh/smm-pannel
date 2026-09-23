import { Router } from 'express';
import { ROLES } from '@smm/types';
import { requireAdmin } from '@smm/auth';
import { adminLicenseRouter } from './license';
import { adminUsersRouter } from './users';
import { adminOrdersRouter } from './orders';
import { adminWalletRouter } from './wallet';
import { adminSettingsRouter } from './settings';
import { adminThemeRouter } from './theme';
import { adminUserThemeRouter } from './user-theme';
import { adminSubAdminsRouter } from './sub-admins';
import { buildCategoriesRouter, buildServicesRouter } from '../super-admin/catalog';
import { buildEngagementBundlesRouter } from '../super-admin/engagement-bundles';

/**
 * Every route under /api/v1/admin is guarded by requireAdmin(), which also
 * fails closed when the admin's license is missing / expired / suspended / revoked.
 */
export function adminRouter(): Router {
  const router = Router();

  // License status/activation must be reachable without a valid license so an
  // admin can recover access. It is still fully authenticated.
  router.use('/license', adminLicenseRouter());

  // Everything below requires an authenticated admin WITH a valid license.
  router.use(requireAdmin());

  router.use('/users', adminUsersRouter());
  router.use('/orders', adminOrdersRouter());
  router.use('/services', buildServicesRouter(ROLES.ADMIN));
  router.use('/categories', buildCategoriesRouter(ROLES.ADMIN));
  router.use('/engagement-bundles', buildEngagementBundlesRouter(ROLES.ADMIN));
  router.use('/wallet', adminWalletRouter());
  router.use('/settings', adminSettingsRouter());
  router.use('/theme', adminThemeRouter());
  router.use('/user-theme', adminUserThemeRouter());
  router.use('/sub-admins', adminSubAdminsRouter());

  return router;
}