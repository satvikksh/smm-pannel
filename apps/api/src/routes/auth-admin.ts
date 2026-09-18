import { Router } from 'express';
import { ROLES, adminLoginSchema } from '@smm/types';
import { validateBody } from '../middleware/validate';
import { rateLimitAuth } from '../middleware/rate-limit';
import { loginHandler, logoutHandler, meHandler, refreshHandler } from './auth/core';

export function authAdminRouter(): Router {
  const router = Router();
  const role = ROLES.ADMIN;

  router.post('/login', rateLimitAuth({ max: 8 }), validateBody(adminLoginSchema), loginHandler(role));
  router.post('/refresh', rateLimitAuth({ max: 20 }), refreshHandler(role));
  router.post('/logout', logoutHandler(role));
  router.get('/me', meHandler(role));

  return router;
}