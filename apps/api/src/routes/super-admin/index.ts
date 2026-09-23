import { Router } from 'express';
import { ROLES } from '@smm/types';
import { requireSuperAdmin } from '@smm/auth';
import { superAdminAdminsRouter } from './admins';
import { superAdminAdminRequestsRouter } from './admin-requests';
import { superAdminAdminThemesRouter } from './admin-themes';
import { superAdminLicensesRouter } from './licenses';
import { superAdminUsersRouter } from './users';
import { buildCategoriesRouter, buildServicesRouter } from './catalog';
import { buildEngagementBundlesRouter } from './engagement-bundles';
import { superAdminOrdersRouter } from './orders';
import { superAdminPaymentsRouter } from './payments';
import { superAdminSettingsRouter } from './settings';
import { superAdminAnalyticsRouter } from './analytics';
import { superAdminAuditLogsRouter } from './audit-logs';
import { superAdminPlatformThemeRouter } from './platform-theme';

/**
 * Every route under /api/v1/super-admin is guarded by requireSuperAdmin().
 * The role comes from the database, not from the client.
 */
export function superAdminRouter(): Router {
  const router = Router();
  router.use(requireSuperAdmin());

  router.use('/admin-themes', superAdminAdminThemesRouter());
  router.use('/admin-requests', superAdminAdminRequestsRouter());
  router.use('/admins', superAdminAdminsRouter());
  router.use('/licenses', superAdminLicensesRouter());
  router.use('/users', superAdminUsersRouter());
  router.use('/services', buildServicesRouter(ROLES.SUPER_ADMIN));
  router.use('/categories', buildCategoriesRouter(ROLES.SUPER_ADMIN));
  router.use('/engagement-bundles', buildEngagementBundlesRouter(ROLES.SUPER_ADMIN));
  router.use('/orders', superAdminOrdersRouter());
  router.use('/payments', superAdminPaymentsRouter());
  router.use('/settings', superAdminSettingsRouter());
  router.use('/analytics', superAdminAnalyticsRouter());
  router.use('/audit-logs', superAdminAuditLogsRouter());
  router.use('/platform-theme', superAdminPlatformThemeRouter());

  return router;
}