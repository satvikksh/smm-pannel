import { Router } from 'express';
import { requireUser } from '@smm/auth';
import { userCatalogRouter } from './catalog';
import { userOrdersRouter } from './orders';
import { userWalletRouter } from './wallet';
import { userSettingsRouter } from './settings';
import { userThemeRouter } from './theme';

/**
 * Every route under /api/v1/user is guarded by requireUser().
 */
export function userRouter(): Router {
  const router = Router();
  router.use(requireUser());

  router.use('/catalog', userCatalogRouter());
  router.use('/orders', userOrdersRouter());
  router.use('/wallet', userWalletRouter());
  router.use('/settings', userSettingsRouter());
  router.use('/theme', userThemeRouter());

  return router;
}