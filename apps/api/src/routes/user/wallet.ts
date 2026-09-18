import { Router } from 'express';
import { PaymentMethod, Transaction, Wallet } from '@smm/database';
import { generateReference } from '@smm/security';
import { ApiError, addFundsSchema } from '@smm/types';
import type { AuthedRequest } from '@smm/auth';
import { validateBody } from '../../middleware/validate';
import { serializePaymentMethod, serializeTransaction, serializeWallet } from '../../helpers/transform';

export function userWalletRouter(): Router {
  const router = Router();

  router.get('/', async (req: AuthedRequest, res) => {
    const wallet = await Wallet.findOne({ userId: req.ctx.user._id }).lean();
    if (!wallet) throw ApiError.notFound('Wallet not found.');
    res.json({ data: serializeWallet(wallet) });
  });

  router.get('/transactions', async (req: AuthedRequest, res) => {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const filter: Record<string, unknown> = { userId: req.ctx.user._id };
    const total = await Transaction.countDocuments(filter);
    const txns = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    res.json({
      data: {
        items: txns.map(serializeTransaction),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  });

  router.get('/payment-methods', async (_req, res) => {
    const methods = await PaymentMethod.find({ enabled: true }).sort({ createdAt: 1 }).lean();
    res.json({ data: methods.map(serializePaymentMethod) });
  });

  // Simulated manual credit: request is recorded and balance is credited immediately.
  router.post('/add-funds', validateBody(addFundsSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { amount: number; paymentMethodId?: string };
    const userId = req.ctx.user._id;
    const wallet = await Wallet.findOne({ userId }).lean();
    if (!wallet) throw ApiError.notFound('Wallet not found.');

    const method = body.paymentMethodId
      ? await PaymentMethod.findOne({ _id: body.paymentMethodId, enabled: true }).lean()
      : null;

    const newBalance = Number((wallet.balance + body.amount).toFixed(2));
    await Wallet.updateOne(
      { _id: wallet._id },
      { $set: { balance: newBalance, totalDeposited: wallet.totalDeposited + body.amount } },
    );

    const txn = await Transaction.create({
      userId,
      type: 'credit',
      status: 'completed',
      amount: body.amount,
      balanceAfter: newBalance,
      reference: generateReference(),
      description: `Funds added via ${method?.name ?? 'manual'}`,
    });

    res.status(201).json({ data: serializeTransaction(txn) });
  });

  return router;
}