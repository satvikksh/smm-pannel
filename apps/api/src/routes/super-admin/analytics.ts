import { Router } from 'express';
import { AuditLog, License, Order, Transaction, User, Wallet } from '@smm/database';
import { ROLES } from '@smm/types';

export function superAdminAnalyticsRouter(): Router {
  const router = Router();

  router.get('/overview', async (_req, res) => {
    const [totalUsers, totalAdmins, activeAdmins, suspendedAdmins, pendingAdminRequests, activeLicenses, expiredLicenses] =
      await Promise.all([
        User.countDocuments({ role: ROLES.USER }),
        User.countDocuments({ role: ROLES.ADMIN }),
        User.countDocuments({ role: ROLES.ADMIN, status: 'active' }),
        User.countDocuments({ role: ROLES.ADMIN, status: 'suspended' }),
        User.countDocuments({ role: ROLES.ADMIN, status: 'pending' }),
        License.countDocuments({ status: 'active', expiresAt: { $gt: new Date() } }),
        License.countDocuments({ $or: [{ status: 'expired' }, { expiresAt: { $lte: new Date() } }] }),
      ]);

    const [revenueAgg, totalOrders, completedOrders, pendingOrders, depositAgg, spentAgg] =
      await Promise.all([
        Order.aggregate([{ $group: { _id: null, total: { $sum: '$price' } } }]),
        Order.countDocuments(),
        Order.countDocuments({ status: 'completed' }),
        Order.countDocuments({ status: 'pending' }),
        Transaction.aggregate([{ $match: { type: 'credit', status: { $ne: 'failed' } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        Transaction.aggregate([{ $match: { type: 'debit', status: { $ne: 'failed' } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      ]);

    const now = new Date();
    const since = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
    const days: string[] = [];
    for (let i = 0; i < 14; i += 1) {
      const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
      days.push(d.toISOString().slice(0, 10));
    }

    const [ordersByDay, revenueByDay, walletStats] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            amount: { $sum: '$price' },
          },
        },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: since }, status: { $in: ['completed', 'partial', 'processing', 'in_progress'] } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            amount: { $sum: '$price' },
          },
        },
      ]),
      Wallet.aggregate([
        {
          $group: {
            _id: null,
            balance: { $sum: '$balance' },
            totalDeposited: { $sum: '$totalDeposited' },
            totalSpent: { $sum: '$totalSpent' },
          },
        },
      ]),
    ]);

    const ordersMap = new Map(ordersByDay.map((o) => [o._id, o]));
    const revenueMap = new Map(revenueByDay.map((o) => [o._id, o]));

    res.json({
      data: {
        totalUsers,
        totalAdmins,
        activeAdmins,
        suspendedAdmins,
        pendingAdminRequests,
        activeLicenses,
        expiredLicenses,
        revenue: revenueAgg[0]?.total ?? 0,
        totalOrders,
        completedOrders,
        pendingOrders,
        walletBalance: walletStats[0]?.balance ?? 0,
        totalDeposited: depositAgg[0]?.total ?? 0,
        totalSpent: spentAgg[0]?.total ?? 0,
        ordersByDay: days.map((day) => ({
          date: day,
          count: ordersMap.get(day)?.count ?? 0,
          amount: ordersMap.get(day)?.amount ?? 0,
        })),
        revenueByDay: days.map((day) => ({
          date: day,
          amount: revenueMap.get(day)?.amount ?? 0,
        })),
      },
    });
  });

  router.get('/recent-activity', async (_req, res) => {
    const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(10).lean();
    res.json({
      data: logs.map((l) => ({
        id: String(l._id),
        actorName: l.actorName,
        actorRole: l.actorRole,
        action: l.action,
        targetLabel: l.targetLabel,
        result: l.result,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  });

  return router;
}