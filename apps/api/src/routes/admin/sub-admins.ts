import { Router } from 'express';
import { User } from '@smm/database';
import { hashPassword } from '@smm/security';
import {
  ApiError,
  AUDIT_ACTIONS,
  ROLES,
  createSubAdminSchema,
  paginationSchema,
  updateSubAdminSchema,
} from '@smm/types';
import { assertMainAdmin, ipFrom, writeAuditLog, type AuthedRequest } from '@smm/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { serializeUser } from '../../helpers/transform';

/**
 * Sub Admin (Partial Admin) management for a Main Admin's tenant.
 *
 *  - GET    /       list sub admins (Main Admin only)
 *  - POST   /       create sub admin (Main Admin only, audited)
 *  - PATCH  /:id    update sub admin scopes (Main Admin only)
 *  - DELETE /:id    soft-delete sub admin (Main Admin only)
 *
 * Sub Admins are user-role=admin entries with `parentAdminId = Main Admin._id`.
 * They log in on the parent's panel URL using the tenant license key.
 */
export function adminSubAdminsRouter(): Router {
  const router = Router();

  router.get('/', validateQuery(paginationSchema), async (req: AuthedRequest, res) => {
    assertMainAdmin(req.ctx.user);
    const q = res.locals.query as { page: number; limit: number; search?: string };
    const filter: Record<string, unknown> = {
      role: ROLES.ADMIN,
      parentAdminId: req.ctx.user._id,
    };
    if (q.search) {
      const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean();
    res.json({
      data: {
        items: users.map((u) => serializeUser(u)),
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.max(1, Math.ceil(total / q.limit)),
      },
    });
  });

  router.post('/', validateBody(createSubAdminSchema), async (req: AuthedRequest, res) => {
    assertMainAdmin(req.ctx.user);
    const body = req.body as {
      name: string;
      email: string;
      phone: string;
      password: string;
      adminScopes: string[];
    };
    const email = body.email.trim().toLowerCase();

    const existing = await User.findOne({ email }).lean();
    if (existing) throw ApiError.conflict('An account with this email already exists.');
    const existingPhone = await User.findOne({ phone: body.phone }).lean();
    if (existingPhone) throw ApiError.conflict('An account with this phone number already exists.');

    const passwordHash = await hashPassword(body.password);
    const sub = new User({
      name: body.name,
      email,
      phone: body.phone,
      passwordHash,
      role: ROLES.ADMIN,
      status: 'active',
      parentAdminId: req.ctx.user._id,
      adminScopes: body.adminScopes,
    });
    await sub.save();

    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.ADMIN,
      action: AUDIT_ACTIONS.ADMIN_SUB_ADMIN_CREATE,
      targetType: 'sub_admin',
      targetId: String(sub._id),
      targetLabel: sub.email,
      ip: ipFrom(req),
      metadata: { adminScopes: body.adminScopes },
    });

    res.status(201).json({ data: { admin: serializeUser(sub) } });
  });

  router.patch('/:id', validateBody(updateSubAdminSchema), async (req: AuthedRequest, res) => {
    assertMainAdmin(req.ctx.user);
    const body = req.body as { adminScopes: string[] };
    const sub = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN, parentAdminId: req.ctx.user._id }).lean();
    if (!sub) throw ApiError.notFound('Sub admin not found in your tenant.');
    await User.updateOne({ _id: sub._id }, { $set: { adminScopes: body.adminScopes } });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.ADMIN,
      action: AUDIT_ACTIONS.ADMIN_SUB_ADMIN_UPDATE,
      targetType: 'sub_admin',
      targetId: String(sub._id),
      targetLabel: sub.email,
      ip: ipFrom(req),
      metadata: { adminScopes: body.adminScopes },
    });
    const updated = await User.findById(sub._id).lean();
    res.json({ data: { admin: updated ? serializeUser(updated) : serializeUser(sub) } });
  });

  router.delete('/:id', async (req: AuthedRequest, res) => {
    assertMainAdmin(req.ctx.user);
    const sub = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN, parentAdminId: req.ctx.user._id }).lean();
    if (!sub) throw ApiError.notFound('Sub admin not found in your tenant.');
    await User.updateOne({ _id: sub._id }, { $set: { status: 'deleted' } });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.ADMIN,
      action: AUDIT_ACTIONS.ADMIN_SUB_ADMIN_DELETE,
      targetType: 'sub_admin',
      targetId: String(sub._id),
      targetLabel: sub.email,
      ip: ipFrom(req),
    });
    res.json({ data: { message: 'Sub admin deleted.' } });
  });

  return router;
}