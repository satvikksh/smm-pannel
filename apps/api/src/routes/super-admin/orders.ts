import { Router } from 'express';
import { Order, User } from '@smm/database';
import {
  ApiError,
  ROLES,
  AUDIT_ACTIONS,
  ORDER_STATUSES,
  paginationSchema,
  updateOrderStatusSchema,
} from '@smm/types';
import { ipFrom, writeAuditLog, type AuthedRequest } from '@smm/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { serializeOrder } from '../../helpers/transform';

export function superAdminOrdersRouter(): Router {
  const router = Router();

  router.get(
    '/',
    validateQuery(
      paginationSchema.extend({
        status: updateOrderStatusSchema.shape.status.optional(),
        search: paginationSchema.shape.search,
      }),
    ),
    async (req, res) => {
      const q = res.locals.query as { page: number; limit: number; search?: string; status?: string };
      const filter: Record<string, unknown> = {};
      if (q.status) filter.status = q.status;
      if (q.search) {
        const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const userIds = (await User.find({ $or: [{ name: rx }, { email: rx }] }).select('_id').lean()).map(
          (u) => u._id,
        );
        filter.$or = [{ serviceName: rx }, { link: rx }, { userId: { $in: userIds } }];
      }
      const total = await Order.countDocuments(filter);
      const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .lean();
      const userIds = [...new Set(orders.map((o) => String(o.userId)))];
      const users = await User.find({ _id: { $in: userIds } }).lean();
      const userMap = new Map(users.map((u) => [String(u._id), u.name]));
      res.json({
        data: {
          items: orders.map((o) => ({
            ...serializeOrder(o),
            userName: userMap.get(String(o.userId)) ?? '',
          })),
          total,
          page: q.page,
          limit: q.limit,
          totalPages: Math.max(1, Math.ceil(total / q.limit)),
        },
      });
    },
  );

  router.patch('/:id/status', validateBody(updateOrderStatusSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { status: string; startCounter?: number; remaining?: number };
    const order = await Order.findById(req.params.id).lean();
    if (!order) throw ApiError.notFound('Order not found.');

    const patch: Record<string, unknown> = { status: body.status };
    if (body.startCounter !== undefined) patch.startCounter = body.startCounter;
    if (body.remaining !== undefined) patch.remaining = body.remaining;

    if (body.status === ORDER_STATUSES.COMPLETED) {
      patch.remaining = 0;
      if (patch.startCounter === undefined) patch.startCounter = order.quantity;
    }

    await Order.updateOne({ _id: order._id }, { $set: patch });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.ORDER_UPDATE_STATUS,
      targetType: 'order',
      targetId: String(order._id),
      targetLabel: order.serviceName,
      ip: ipFrom(req),
      metadata: { from: order.status, to: body.status },
    });
    const updated = await Order.findById(order._id).lean();
    res.json({ data: serializeOrder(updated!) });
  });

  return router;
}