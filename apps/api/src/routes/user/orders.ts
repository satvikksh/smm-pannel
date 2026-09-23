import { Router } from 'express';
import { EngagementBundle, Order, Service, Transaction, Wallet, Category } from '@smm/database';
import { ApiError, ORDER_STATUSES, createBundleOrderSchema, createOrderSchema } from '@smm/types';
import type { AuthedRequest } from '@smm/auth';
import { validateBody } from '../../middleware/validate';
import { serializeOrder } from '../../helpers/transform';

export function userOrdersRouter(): Router {
  const router = Router();

  router.post('/', validateBody(createOrderSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { serviceId: string; link: string; quantity: number };
    const userId = req.ctx.user._id;

    const service = await Service.findOne({ _id: body.serviceId, status: 'active' }).lean();
    if (!service) throw ApiError.notFound('Service not found or inactive.');

    if (body.quantity < service.minOrder || body.quantity > service.maxOrder) {
      throw ApiError.validation('Quantity out of range', {
        quantity: [`Minimum ${service.minOrder}, maximum ${service.maxOrder}.`],
      });
    }

    const price = Number((body.quantity * service.price).toFixed(2));
    const wallet = await Wallet.findOne({ userId }).lean();
    if (!wallet) throw ApiError.notFound('Wallet not found.');
    if (wallet.balance < price) {
      throw ApiError.badRequest('Insufficient balance. Please add funds to your wallet.');
    }

    const category = await Category.findById(service.categoryId).lean();

    const order = await Order.create({
      userId,
      serviceId: service._id,
      serviceName: service.name,
      categoryName: category?.name ?? '',
      link: body.link.trim(),
      quantity: body.quantity,
      price,
      status: ORDER_STATUSES.PENDING,
      startCounter: 0,
      remaining: body.quantity,
    });

    const newBalance = Number((wallet.balance - price).toFixed(2));
    await Wallet.updateOne({ _id: wallet._id }, { $set: { balance: newBalance, totalSpent: wallet.totalSpent + price } });

    await Transaction.create({
      userId,
      type: 'debit',
      status: 'completed',
      amount: price,
      balanceAfter: newBalance,
      reference: `ORD-${order._id.toString().slice(-8).toUpperCase()}`,
      description: `Order placed: ${service.name} (${body.quantity})`,
    });

    res.status(201).json({ data: serializeOrder(order) });
  });

  /**
   * Engagement bundle order. Only `bundleId` + `link` are accepted — any
   * client-sent price/quantity is stripped by zod and the server prices the
   * order exclusively from the stored, active bundle.
   */
  router.post('/bundle', validateBody(createBundleOrderSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { bundleId: string; link: string };
    const userId = req.ctx.user._id;

    const bundle = await EngagementBundle.findOne({ _id: body.bundleId, status: 'active', deletedAt: null }).lean();
    if (!bundle) {
      const existing = await EngagementBundle.findById(body.bundleId)
        .select({ status: 1, deletedAt: 1 })
        .lean();
      if (existing) {
        throw ApiError.badRequest('This package is currently unavailable. Please choose another one.');
      }
      throw ApiError.notFound('Engagement bundle not found.');
    }

    const quantity = bundle.quantity;
    const price = Math.round(bundle.price * 100) / 100;
    const categoryName = bundle.type.charAt(0).toUpperCase() + bundle.type.slice(1);

    const wallet = await Wallet.findOne({ userId }).lean();
    if (!wallet) throw ApiError.notFound('Wallet not found.');
    if (wallet.balance < price) {
      throw ApiError.badRequest('Insufficient balance. Please add funds to your wallet.');
    }

    const order = await Order.create({
      userId,
      serviceId: bundle._id,
      serviceName: bundle.displayName,
      categoryName,
      link: body.link.trim(),
      quantity,
      price,
      bundleId: bundle._id,
      bundleType: bundle.type,
      currency: bundle.currency,
      status: ORDER_STATUSES.PENDING,
      startCounter: 0,
      remaining: quantity,
    });

    const newBalance = Number((wallet.balance - price).toFixed(2));
    await Wallet.updateOne({ _id: wallet._id }, { $set: { balance: newBalance, totalSpent: wallet.totalSpent + price } });

    await Transaction.create({
      userId,
      type: 'debit',
      status: 'completed',
      amount: price,
      balanceAfter: newBalance,
      reference: `ORD-${order._id.toString().slice(-8).toUpperCase()}`,
      description: `Engagement order: ${bundle.displayName} (${quantity})`,
    });

    res.status(201).json({ data: serializeOrder(order) });
  });

  router.get('/', async (req: AuthedRequest, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const filter: Record<string, unknown> = { userId: req.ctx.user._id };
    const status = req.query.status;
    if (typeof status === 'string' && status) filter.status = status;
    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    res.json({
      data: {
        items: orders.map(serializeOrder),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  });

  router.get('/:id', async (req: AuthedRequest, res) => {
    const order = await Order.findOne({ _id: req.params.id, userId: req.ctx.user._id }).lean();
    if (!order) throw ApiError.notFound('Order not found.');
    res.json({ data: serializeOrder(order) });
  });

  return router;
}