import { Router } from 'express';
import { PaymentMethod } from '@smm/database';
import { buildPublicSettings, serializePaymentMethod } from '../../helpers/transform';

export function userSettingsRouter(): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const settings = await buildPublicSettings();
    const paymentMethods = await PaymentMethod.find({ enabled: true }).sort({ createdAt: 1 }).lean();
    res.json({
      data: {
        settings,
        paymentMethods: paymentMethods.map(serializePaymentMethod),
      },
    });
  });

  return router;
}