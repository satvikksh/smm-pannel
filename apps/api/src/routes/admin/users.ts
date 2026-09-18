import { Router } from 'express';
import { Order, Transaction, User, Wallet } from '@smm/database';
import { hashPassword } from '@smm/security';
import {
  ADMIN_SCOPES,
  ApiError,
  ROLES,
  AUDIT_ACTIONS,
  createTenantUserSchema,
  claimUserSchema,
  paginationSchema,
  updateUserStatusSchema,
} from '@smm/types';
import {
  assertAdminScope,
  ipFrom,
  isSubAdmin,
  tenantAdminIdOf,
  toSafeUser,
  writeAuditLog,
  type AuthedRequest,
} from '@smm/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { serializeTransaction, serializeWallet } from '../../helpers/transform';

/**
 * Admin user management, strictly scoped to the actor's tenant:
 *
 *  - Main Admin sees users with `adminId = own id`.
 *  - Sub Admin (with viewUsers / manageUsers) sees users with
 *    `adminId = parent id AND assignedTo = own id`.
 *  - Created / claimed users are stamped with the tenant `adminId` and the
 *    acting admin in `assignedTo`.
 */
export function adminUsersRouter(): Router {
  const router = Router();

  function tenantScope(actor: AuthedRequest['ctx']['user']) {
    const adminId = tenantAdminIdOf(actor)!;
    if (isSubAdmin(actor)) {
      return { role: ROLES.USER, adminId, assignedTo: actor._id };
    }
    return { role: ROLES.USER, adminId };
  }

  router.get(
    '/',
    validateQuery(paginationSchema.extend({ status: updateUserStatusSchema.shape.status.optional() })),
    async (req: AuthedRequest, res) => {
      assertAdminScope(req.ctx.user, ADMIN_SCOPES.VIEW_USERS);
      const q = res.locals.query as { page: number; limit: number; search?: string; status?: string };
      const filter: Record<string, unknown> = tenantScope(req.ctx.user);
      if (q.status) filter.status = q.status;
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
      const wallets = await Wallet.find({ userId: { $in: users.map((u) => u._id) } }).lean();
      const walletMap = new Map(wallets.map((w) => [String(w.userId), serializeWallet(w)]));
      res.json({
        data: {
          items: users.map((u) => ({
            ...toSafeUser(u),
            wallet: walletMap.get(String(u._id)) ?? null,
          })),
          total,
          page: q.page,
          limit: q.limit,
          totalPages: Math.max(1, Math.ceil(total / q.limit)),
        },
      });
    },
  );

  router.get('/:id', async (req: AuthedRequest, res) => {
    assertAdminScope(req.ctx.user, ADMIN_SCOPES.VIEW_USERS);
    const scope = tenantScope(req.ctx.user);
    const user = await User.findOne({ _id: req.params.id, ...scope }).lean();
    if (!user) throw ApiError.notFound('User not found in your panel.');
    const wallet = await Wallet.findOne({ userId: user._id }).lean();
    const ordersCount = await Order.countDocuments({ userId: user._id });
    const transactions = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20).lean();
    res.json({
      data: {
        user: toSafeUser(user),
        wallet: wallet ? serializeWallet(wallet) : null,
        ordersCount,
        transactions: transactions.map(serializeTransaction),
      },
    });
  });

  router.post('/', validateBody(createTenantUserSchema), async (req: AuthedRequest, res) => {
    assertAdminScope(req.ctx.user, ADMIN_SCOPES.MANAGE_USERS);
    const body = req.body as { name: string; email: string; phone: string; password: string };
    const email = body.email.trim().toLowerCase();

    const existing = await User.findOne({ email }).lean();
    if (existing) throw ApiError.conflict('An account with this email already exists.');
    const existingPhone = await User.findOne({ phone: body.phone }).lean();
    if (existingPhone) throw ApiError.conflict('An account with this phone number already exists.');

    const passwordHash = await hashPassword(body.password);
    const user = new User({
      name: body.name,
      email,
      phone: body.phone,
      passwordHash,
      role: ROLES.USER,
      status: 'active',
      adminId: tenantAdminIdOf(req.ctx.user)!,
      assignedTo: req.ctx.user._id,
    });
    await user.save();

    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.ADMIN,
      action: AUDIT_ACTIONS.ADMIN_TENANT_USER_CREATE,
      targetType: 'user',
      targetId: String(user._id),
      targetLabel: user.email,
      ip: ipFrom(req),
    });

    res.status(201).json({ data: { user: toSafeUser(user) } });
  });

  router.post('/claim', validateBody(claimUserSchema), async (req: AuthedRequest, res) => {
    assertAdminScope(req.ctx.user, ADMIN_SCOPES.MANAGE_USERS);
    const body = req.body as { email: string };
    const email = body.email.trim().toLowerCase();
    const target = await User.findOne({ email, role: ROLES.USER }).lean();
    if (!target) throw ApiError.notFound('No account found with that email.');
    if (target.adminId) throw ApiError.conflict('That account already belongs to a panel.');

    await User.updateOne(
      { _id: target._id },
      { $set: { adminId: tenantAdminIdOf(req.ctx.user)!, assignedTo: req.ctx.user._id } },
    );

    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.ADMIN,
      action: AUDIT_ACTIONS.ADMIN_TENANT_USER_CLAIM,
      targetType: 'user',
      targetId: String(target._id),
      targetLabel: target.email,
      ip: ipFrom(req),
    });

    const updated = await User.findById(target._id).lean();
    res.json({ data: { user: updated ? toSafeUser(updated) : toSafeUser(target) } });
  });

  router.patch('/:id/status', validateBody(updateUserStatusSchema), async (req: AuthedRequest, res) => {
    assertAdminScope(req.ctx.user, ADMIN_SCOPES.MANAGE_USERS);
    const body = req.body as { status: string };
    const scope = tenantScope(req.ctx.user);
    const user = await User.findOne({ _id: req.params.id, ...scope }).lean();
    if (!user) throw ApiError.notFound('User not found in your panel.');
    await User.updateOne({ _id: user._id }, { $set: { status: body.status } });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.ADMIN,
      action: AUDIT_ACTIONS.USER_UPDATE_STATUS,
      targetType: 'user',
      targetId: String(user._id),
      targetLabel: user.email,
      ip: ipFrom(req),
      metadata: { status: body.status },
    });
    const updated = await User.findById(user._id).lean();
    res.json({ data: { user: updated ? toSafeUser(updated) : toSafeUser(user) } });
  });

  return router;
}