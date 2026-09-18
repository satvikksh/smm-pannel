import { Router } from 'express';
import { Order, User } from '@smm/database';
import {
  ADMIN_SCOPES,
  ApiError,
  ROLES,
  AUDIT_ACTIONS,
  ORDER_STATUSES,
  paginationSchema,
  updateOrderStatusSchema,
} from '@smm/types';
import {
  assertAdminScope,
  ipFrom,
  isSubAdmin,
  tenantAdminIdOf,
  writeAuditLog,
  type AuthedRequest,
} from '@smm/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { serializeOrder } from '../../helpers/transform';

/**
 * Admin order management, strictly scoped to the actor's tenant:
 *
 *  - Main Admin sees orders from users with `adminId = own id`.
 *  - Sub Admin (with viewOrders) sees orders from users with
 *    `adminId = parent id AND assignedTo = own id`.
 */
export function adminOrdersRouter(): Router {
  const router = Router();

  async function tenantUserIds(actor: AuthedRequest['ctx']['user']): Promise<{ _id: string }[]> {
    const adminId = tenantAdminIdOf(actor)!;
    const filter: Record<string, unknown> = { role: ROLES.USER, adminId };
    if (isSubAdmin(actor)) filter.assignedTo = actor._id;
    const users = await User.find(filter).select('_id').lean();
    return users.map((u) => ({ _id: String(u._id) }));
  }

  async function assertInScope(actor: AuthedRequest['ctx']['user'], order: { userId: unknown }): Promise<void> {
    const userIds = new Set((await tenantUserIds(actor)).map((u) => u._id));
    if (!userIds.has(String(order.userId))) {
      throw ApiError.notFound('Order not found in your panel.');
    }
  }

  router.get(
    '/',
    validateQuery(
      paginationSchema.extend({
        status: updateOrderStatusSchema.shape.status.optional(),
      }),
    ),
    async (req: AuthedRequest, res) => {
      assertAdminScope(req.ctx.user, ADMIN_SCOPES.VIEW_ORDERS);
      const q = res.locals.query as { page: number; limit: number; search?: string; status?: string };
      const scopedUserIds = (await tenantUserIds(req.ctx.user)).map((u) => u._id);
      const filter: Record<string, unknown> = { userId: { $in: scopedUserIds } };
      if (q.status) filter.status = q.status;
      if (q.search) {
        const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const searchedUsers = await User.find({
          _id: { $in: scopedUserIds },
          $or: [{ name: rx }, { email: rx }],
        })
          .select('_id')
          .lean();
        filter.$or = [
          { serviceName: rx },
          { link: rx },
          { userId: { $in: searchedUsers.map((u) => u._id) } },
        ];
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
          items: orders.map((o) => ({ ...serializeOrder(o), userName: userMap.get(String(o.userId)) ?? '' })),
          total,
          page: q.page,
          limit: q.limit,
          totalPages: Math.max(1, Math.ceil(total / q.limit)),
        },
      });
    },
  );

  router.get('/:id', async (req: AuthedRequest, res) => {
    assertAdminScope(req.ctx.user, ADMIN_SCOPES.VIEW_ORDERS);
    const order = await Order.findById(req.params.id).lean();
    if (!order) throw ApiError.notFound('Order not found.');
    await assertInScope(req.ctx.user, order);
    const user = await User.findById(order.userId).lean();
    res.json({ data: { ...serializeOrder(order), userName: user?.name ?? '' } });
  });

  router.patch('/:id/status', validateBody(updateOrderStatusSchema), async (req: AuthedRequest, res) => {
    assertAdminScope(req.ctx.user, ADMIN_SCOPES.VIEW_ORDERS);
    const body = req.body as { status: string; startCounter?: number; remaining?: number };
    const order = await Order.findById(req.params.id).lean();
    if (!order) throw ApiError.notFound('Order not found.');
    await assertInScope(req.ctx.user, order);

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
      actorRole: ROLES.ADMIN,
      action: AUDIT_ACTIONS.ORDER_UPDATE_STATUS,
      targetType: 'order',
      targetId: String(order._id),
      targetLabel: order.serviceName,
      ip: ipFrom(req),
      metadata: { from: order.status, to: body.status },
    });
    const updated = await Order.findById(order._id).lean();
    res.json({ data: updated ? serializeOrder(updated) : serializeOrder(order) });
  });

  return router;
}