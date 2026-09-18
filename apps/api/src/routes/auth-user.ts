import { Router } from 'express';
import { Wallet, User } from '@smm/database';
import { hashPassword, verifyPassword } from '@smm/security';
import { ApiError, ROLES, loginSchema, registerSchema, updateProfileSchema, changePasswordSchema } from '@smm/types';
import { authorize, issueSession, toSafeUser } from '@smm/auth';
import { validateBody } from '../middleware/validate';
import { rateLimitAuth } from '../middleware/rate-limit';
import { serializeWallet } from '../helpers/transform';
import { loginHandler, logoutHandler, refreshHandler } from './auth/core';

export function authUserRouter(): Router {
  const router = Router();
  const role = ROLES.USER;

  router.post('/register', rateLimitAuth({ max: 8 }), validateBody(registerSchema), async (req, res) => {
    const body = req.body as typeof req.body & { email: string };
    const email = body.email.trim().toLowerCase();

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
      status: 'active',
    });
    await user.save();
    const wallet = await Wallet.create({
      userId: user._id,
      balance: 0,
      totalDeposited: 0,
      totalSpent: 0,
    });

    await issueSession(user, role, res);
    res.status(201).json({
      data: { user: toSafeUser(user), wallet: serializeWallet(wallet) },
    });
  });

  router.post('/login', rateLimitAuth({ max: 10 }), validateBody(loginSchema), loginHandler(role));

  router.post('/refresh', rateLimitAuth({ max: 20 }), refreshHandler(role));

  router.post('/logout', logoutHandler(role));

  router.get('/me', async (req, res) => {
    const identity = await authorize(req, role);
    const wallet = await Wallet.findOne({ userId: identity.user._id }).lean();
    res.json({
      data: {
        user: toSafeUser(identity.user),
        wallet: wallet ? serializeWallet(wallet) : undefined,
      },
    });
  });

  router.patch('/me', validateBody(updateProfileSchema), async (req, res) => {
    const identity = await authorize(req, role);
    const body = req.body as { name?: string; phone?: string };
    if (body.name) identity.user.name = body.name;
    if (body.phone) identity.user.phone = body.phone;
    await User.updateOne({ _id: identity.user._id }, { $set: { name: identity.user.name, phone: identity.user.phone } });
    const updated = await User.findById(identity.user._id).lean();
    res.json({ data: { user: toSafeUser(updated!) } });
  });

  router.post('/me/password', validateBody(changePasswordSchema), async (req, res) => {
    const identity = await authorize(req, role);
    const body = req.body as { currentPassword: string; newPassword: string };
    const ok = await verifyPassword(body.currentPassword, identity.user.passwordHash);
    if (!ok) throw ApiError.forbidden('Current password is incorrect.');
    const passwordHash = await hashPassword(body.newPassword);
    await User.updateOne({ _id: identity.user._id }, { $set: { passwordHash } });
    res.json({ data: { message: 'Password updated' } });
  });

  return router;
}