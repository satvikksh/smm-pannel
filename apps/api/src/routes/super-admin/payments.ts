import { Router } from 'express';
import { PaymentMethod } from '@smm/database';
import {
  ApiError,
  ROLES,
  AUDIT_ACTIONS,
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
} from '@smm/types';
import { ipFrom, writeAuditLog, type AuthedRequest } from '@smm/auth';
import { validateBody } from '../../middleware/validate';
import { serializePaymentMethod } from '../../helpers/transform';

export function superAdminPaymentsRouter(): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const methods = await PaymentMethod.find({}).sort({ createdAt: 1 }).lean();
    res.json({ data: methods.map(serializePaymentMethod) });
  });

  router.post('/', validateBody(createPaymentMethodSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { name: string; code: string; enabled?: boolean; instructions?: string; config?: Record<string, unknown> };
    const method = await PaymentMethod.create({
      name: body.name,
      code: body.code,
      enabled: body.enabled ?? true,
      instructions: body.instructions ?? '',
      config: body.config ?? {},
    });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.PAYMENT_METHOD_UPDATE,
      targetType: 'payment_method',
      targetId: String(method._id),
      targetLabel: method.name,
      ip: ipFrom(req),
      metadata: { created: true },
    });
    res.status(201).json({ data: serializePaymentMethod(method) });
  });

  router.patch('/:id', validateBody(updatePaymentMethodSchema), async (req: AuthedRequest, res) => {
    const body = req.body as Record<string, unknown>;
    const method = await PaymentMethod.findById(req.params.id).lean();
    if (!method) throw ApiError.notFound('Payment method not found.');
    await PaymentMethod.updateOne({ _id: method._id }, { $set: body });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.PAYMENT_METHOD_UPDATE,
      targetType: 'payment_method',
      targetId: String(method._id),
      targetLabel: method.name,
      ip: ipFrom(req),
      metadata: { fields: Object.keys(body) },
    });
    const updated = await PaymentMethod.findById(method._id).lean();
    res.json({ data: serializePaymentMethod(updated!) });
  });

  router.delete('/:id', async (req: AuthedRequest, res) => {
    const method = await PaymentMethod.findById(req.params.id).lean();
    if (!method) throw ApiError.notFound('Payment method not found.');
    await PaymentMethod.deleteOne({ _id: method._id });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.PAYMENT_METHOD_UPDATE,
      targetType: 'payment_method',
      targetId: String(method._id),
      targetLabel: method.name,
      ip: ipFrom(req),
      metadata: { deleted: true },
    });
    res.json({ data: { message: 'Payment method deleted.' } });
  });

  return router;
}