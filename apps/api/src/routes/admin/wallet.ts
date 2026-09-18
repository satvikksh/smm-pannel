import { Router } from 'express';
import { PaymentMethod, Wallet, Order } from '@smm/database';
import { serializePaymentMethod } from '../../helpers/transform';

export function adminWalletRouter(): Router {
  const router = Router();

  router.get('/summary', async (_req, res) => {
    const [walletAgg, depositAgg, spentAgg, ordersAgg] = await Promise.all([
      Wallet.aggregate([{ $group: { _id: null, balance: { $sum: '$balance' } } }]),
      Wallet.aggregate([{ $group: { _id: null, total: { $sum: '$totalDeposited' } } }]),
      Wallet.aggregate([{ $group: { _id: null, total: { $sum: '$totalSpent' } } }]),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$price' }, count: { $sum: 1 } } }]),
    ]);
    res.json({
      data: {
        totalUserBalance: walletAgg[0]?.balance ?? 0,
        totalDeposited: depositAgg[0]?.total ?? 0,
        totalSpent: spentAgg[0]?.total ?? 0,
        orderValue: ordersAgg[0]?.total ?? 0,
        orderCount: ordersAgg[0]?.count ?? 0,
      },
    });
  });

  router.get('/payment-methods', async (_req, res) => {
    const methods = await PaymentMethod.find({}).sort({ createdAt: 1 }).lean();
    res.json({ data: methods.map(serializePaymentMethod) });
  });

  return router;
}