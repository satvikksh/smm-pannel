import { Router } from 'express';
import { Order, Transaction, Wallet, User, AuditLog } from '@smm/database';
import {
  ApiError,
  ROLES,
  AUDIT_ACTIONS,
  paginationSchema,
  updateUserStatusSchema,
} from '@smm/types';
import { ipFrom, toSafeUser, writeAuditLog, type AuthedRequest } from '@smm/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { serializeAuditLog, serializeTransaction, serializeWallet } from '../../helpers/transform';

export function superAdminUsersRouter(): Router {
  const router = Router();

  router.get('/', validateQuery(paginationSchema.extend({ status: updateUserStatusSchema.shape.status.optional() })), async (req, res) => {
    const q = res.locals.query as { page: number; limit: number; search?: string; status?: string };
    const filter: Record<string, unknown> = { role: ROLES.USER };
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
    const walletByUser = new Map(wallets.map((w) => [String(w.userId), serializeWallet(w)]));
    const orderCounts = await Order.aggregate([
      { $match: { userId: { $in: users.map((u) => u._id) } } },
      { $group: { _id: '$userId', count: { $sum: 1 }, spent: { $sum: '$price' } } },
    ]);
    const statsById = new Map(orderCounts.map((o) => [String(o._id), o]));

    res.json({
      data: {
        items: users.map((u) => ({
          ...toSafeUser(u),
          wallet: walletByUser.get(String(u._id)) ?? null,
          ordersCount: statsById.get(String(u._id))?.count ?? 0,
          totalSpent: statsById.get(String(u._id))?.spent ?? 0,
        })),
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.max(1, Math.ceil(total / q.limit)),
      },
    });
  });

  router.get('/:id', async (req, res) => {
    const user = await User.findOne({ _id: req.params.id, role: ROLES.USER }).lean();
    if (!user) throw ApiError.notFound('User not found.');
    const wallet = await Wallet.findOne({ userId: user._id }).lean();
    const ordersCount = await Order.countDocuments({ userId: user._id });
    const transactions = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20).lean();
    const activity = await AuditLog.find({ targetId: String(user._id), targetType: 'user' })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      data: {
        user: toSafeUser(user),
        wallet: wallet ? serializeWallet(wallet) : null,
        ordersCount,
        transactions: transactions.map(serializeTransaction),
        recentActivity: activity.map(serializeAuditLog),
      },
    });
  });

  router.patch('/:id/status', validateBody(updateUserStatusSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { status: string };
    const user = await User.findOne({ _id: req.params.id, role: ROLES.USER }).lean();
    if (!user) throw ApiError.notFound('User not found.');
    await User.updateOne({ _id: user._id }, { $set: { status: body.status } });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.USER_UPDATE_STATUS,
      targetType: 'user',
      targetId: String(user._id),
      targetLabel: user.email,
      ip: ipFrom(req),
      metadata: { status: body.status },
    });
    const updated = await User.findById(user._id).lean();
    res.json({ data: { user: toSafeUser(updated!) } });
  });

  router.delete('/:id', async (req: AuthedRequest, res) => {
    const user = await User.findOne({ _id: req.params.id, role: ROLES.USER }).lean();
    if (!user) throw ApiError.notFound('User not found.');
    await User.updateOne({ _id: user._id }, { $set: { status: 'deleted' } });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.USER_DELETE,
      targetType: 'user',
      targetId: String(user._id),
      targetLabel: user.email,
      ip: ipFrom(req),
    });
    res.json({ data: { message: 'User deleted.' } });
  });

  return router;
}