import { Router } from 'express';
import { User } from '@smm/database';
import { hashPassword } from '@smm/security';
import { ApiError, AUDIT_ACTIONS, ROLES, adminLoginSchema, registerSchema, type Role } from '@smm/types';
import { isSuperAdminEmail, ipFrom, toSafeUser, writeAuditLog } from '@smm/auth';
import { validateBody } from '../middleware/validate';
import { rateLimitAuth } from '../middleware/rate-limit';
import { loginHandler, logoutHandler, meHandler, refreshHandler } from './auth/core';

/**
 * Admin registration flow.
 *
 *  - POST /register   public self-registration. Creates a `pending` admin that
 *                     the Super Admin must approve (and license) before the
 *                     account can sign in. No session is issued here — approval
 *                     is deliberately out of the applicant's hands.
 *  - POST /login      no license key input: the license assigned to the account
 *                     is detected and bound server-side.
 *  - GET /me           session restoration (account must be `active`).
 *  - POST /refresh    session rotation (account must be `active`).
 *  - POST /logout     revokes the session.
 */
export function authAdminRouter(): Router {
  const router = Router();
  const role: Role = ROLES.ADMIN;

  router.post('/register', rateLimitAuth({ max: 8 }), validateBody(registerSchema), async (req, res) => {
    const body = req.body as { name: string; email: string; phone: string; password: string };
    const email = body.email.trim().toLowerCase();

    if (isSuperAdminEmail(email)) {
      throw ApiError.forbidden('This email cannot be used to register an admin account.');
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      throw ApiError.conflict('An account with this email already exists.');
    }
    const existingPhone = await User.findOne({ phone: body.phone }).lean();
    if (existingPhone) {
      throw ApiError.conflict('An account with this phone number already exists.');
    }

    const passwordHash = await hashPassword(body.password);
    const user = new User({
      name: body.name,
      email,
      phone: body.phone,
      passwordHash,
      role,
      status: 'pending',
      authProvider: 'local',
    });
    await user.save();
    // No session is issued: a pending admin cannot authenticate until the
    // Super Admin approves the application.
    await writeAuditLog({
      actorId: undefined,
      actorName: '',
      actorRole: role,
      action: AUDIT_ACTIONS.ADMIN_REGISTER,
      targetType: 'admin',
      targetId: String(user._id),
      targetLabel: user.email,
      ip: ipFrom(req),
      metadata: { provider: 'local' },
    });

    res.status(201).json({
      data: {
        user: toSafeUser(user),
        message: 'Your registration has been submitted for approval.',
      },
    });
  });

  router.post('/login', rateLimitAuth({ max: 10 }), validateBody(adminLoginSchema), loginHandler(role));
  router.post('/refresh', rateLimitAuth({ max: 20 }), refreshHandler(role));
  router.post('/logout', logoutHandler(role));
  router.get('/me', meHandler(role));

  return router;
}