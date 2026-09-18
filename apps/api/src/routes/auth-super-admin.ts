import { Router } from 'express';
import { ROLES, loginSchema } from '@smm/types';
import { validateBody } from '../middleware/validate';
import { rateLimitAuth } from '../middleware/rate-limit';
import { loginHandler, logoutHandler, meHandler, refreshHandler } from './auth/core';

export function authSuperAdminRouter(): Router {
  const router = Router();
  const role = ROLES.SUPER_ADMIN;

  router.post('/login', rateLimitAuth({ max: 8 }), validateBody(loginSchema), loginHandler(role, 'super_admin.login'));
  router.post('/refresh', rateLimitAuth({ max: 20 }), refreshHandler(role));
  router.post('/logout', logoutHandler(role));
  router.get('/me', meHandler(role));

  return router;
}