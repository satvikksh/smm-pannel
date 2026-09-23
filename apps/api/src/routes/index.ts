import { Router } from 'express';
import { getPlatformThemeMeta } from '@smm/database';
import { userRouter } from './user';
import { adminRouter } from './admin';
import { superAdminRouter } from './super-admin';
import { tenantRouter } from './tenant';
import { authUserRouter } from './auth-user';
import { authAdminRouter } from './auth-admin';
import { authSuperAdminRouter } from './auth-super-admin';
import { buildPublicSettings } from '../helpers/transform';

export function apiRouter(): Router {
  const router = Router();

  router.get('/settings/public', async (_req, res) => {
    res.json({ data: await buildPublicSettings() });
  });

  router.get('/theme', async (_req, res) => {
    const meta = await getPlatformThemeMeta();
    res.json({ data: { theme: meta.theme, updatedAt: meta.updatedAt } });
  });

  router.use('/tenant', tenantRouter());

  router.use('/auth/user', authUserRouter());
  router.use('/auth/admin', authAdminRouter());
  router.use('/auth/super-admin', authSuperAdminRouter());

  router.use('/user', userRouter());
  router.use('/admin', adminRouter());
  router.use('/super-admin', superAdminRouter());

  return router;
}