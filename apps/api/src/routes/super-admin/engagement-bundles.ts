import { Router } from 'express';
import { EngagementBundle, type EngagementBundleRecord } from '@smm/database';
import {
  ApiError,
  AUDIT_ACTIONS,
  createEngagementBundleSchema,
  engagementBundlesQuerySchema,
  updateEngagementBundleSchema,
  updateEngagementBundleStatusSchema,
  type EngagementBundle as EngagementBundleEntity,
  type Role,
} from '@smm/types';
import { ipFrom, writeAuditLog, type AuthedRequest } from '@smm/auth';
import { validateBody, validateQuery } from '../../middleware/validate';

function serializeBundle(b: EngagementBundleRecord): EngagementBundleEntity {
  return {
    id: String(b._id),
    type: b.type,
    quantity: b.quantity,
    price: b.price,
    currency: b.currency,
    displayName: b.displayName,
    description: b.description,
    status: b.status,
    sortOrder: b.sortOrder,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    deletedAt: b.deletedAt ? b.deletedAt.toISOString() : null,
  };
}

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Admin/Super Admin Engagement Pricing management. Both panels share the exact
 * behavior; the only difference is the actor role recorded in the audit log.
 * Every mutation is logged and duplicate (type, quantity) is rejected.
 */
export function buildEngagementBundlesRouter(auditRole: Role): Router {
  const router = Router();

  router.get(
    '/',
    validateQuery(engagementBundlesQuerySchema),
    async (req, res) => {
      const q = res.locals.query as {
        page: number;
        limit: number;
        search?: string;
        type?: 'likes' | 'views' | 'subscribers';
        status?: 'active' | 'inactive';
      };
      const filter: Record<string, unknown> = { deletedAt: null };
      if (q.type) filter.type = q.type;
      if (q.status) filter.status = q.status;
      if (q.search) filter.displayName = new RegExp(q.search, 'i');
      const total = await EngagementBundle.countDocuments(filter);
      const items = await EngagementBundle.find(filter)
        .sort({ sortOrder: 1, quantity: 1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .lean();
      res.json({
        data: {
          items: items.map(serializeBundle),
          total,
          page: q.page,
          limit: q.limit,
          totalPages: Math.max(1, Math.ceil(total / q.limit)),
        },
      });
    },
  );

  router.post('/', validateBody(createEngagementBundleSchema), async (req: AuthedRequest, res) => {
    const body = req.body as {
      type: EngagementBundleRecord['type'];
      quantity: number;
      price: number;
      currency: string;
      displayName: string;
      description?: string;
      status?: 'active' | 'inactive';
      sortOrder?: number;
    };
    if (await EngagementBundle.exists({ type: body.type, quantity: body.quantity, deletedAt: null })) {
      throw ApiError.conflict('A bundle with this type and quantity already exists.');
    }
    const bundle = await EngagementBundle.create({
      type: body.type,
      quantity: body.quantity,
      price: roundPrice(body.price),
      currency: body.currency,
      displayName: body.displayName,
      description: body.description ?? '',
      status: body.status ?? 'active',
      sortOrder: body.sortOrder ?? 0,
    });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: auditRole,
      action: AUDIT_ACTIONS.ENGAGEMENT_BUNDLE_CREATE,
      targetType: 'engagementBundle',
      targetId: String(bundle._id),
      targetLabel: `${bundle.displayName} (${bundle.quantity} ${bundle.type})`,
      ip: ipFrom(req),
      metadata: { type: bundle.type, quantity: bundle.quantity, price: bundle.price, currency: bundle.currency },
    });
    res.status(201).json({ data: serializeBundle(bundle.toObject()) });
  });

  router.patch('/:id', validateBody(updateEngagementBundleSchema), async (req: AuthedRequest, res) => {
    const body = req.body as {
      type?: EngagementBundleRecord['type'];
      quantity?: number;
      price?: number;
      currency?: string;
      displayName?: string;
      description?: string;
      status?: 'active' | 'inactive';
      sortOrder?: number;
    };
    const bundle = await EngagementBundle.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!bundle) throw ApiError.notFound('Engagement bundle not found.');

    const patch: Record<string, unknown> = {};
    if (body.displayName !== undefined) patch.displayName = body.displayName;
    if (body.description !== undefined) patch.description = body.description;
    if (body.price !== undefined) patch.price = roundPrice(body.price);
    if (body.currency !== undefined) patch.currency = body.currency;
    if (body.status !== undefined) patch.status = body.status;
    if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;
    if (body.type !== undefined || body.quantity !== undefined) {
      const desiredType = body.type ?? bundle.type;
      const desiredQuantity = body.quantity ?? bundle.quantity;
      patch.type = desiredType;
      patch.quantity = desiredQuantity;
      if (desiredType !== bundle.type || desiredQuantity !== bundle.quantity) {
        const duplicate = await EngagementBundle.exists({
          type: desiredType,
          quantity: desiredQuantity,
          deletedAt: null,
          _id: { $ne: bundle._id },
        });
        if (duplicate) throw ApiError.conflict('A bundle with this type and quantity already exists.');
      }
    }
    if (Object.keys(patch).length === 0) throw ApiError.validation('No fields to update');

    await EngagementBundle.updateOne({ _id: bundle._id }, { $set: patch });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: auditRole,
      action: AUDIT_ACTIONS.ENGAGEMENT_BUNDLE_UPDATE,
      targetType: 'engagementBundle',
      targetId: String(bundle._id),
      targetLabel: `${bundle.displayName} (${bundle.quantity} ${bundle.type})`,
      ip: ipFrom(req),
      metadata: { fields: Object.keys(patch) },
    });
    const updated = await EngagementBundle.findById(bundle._id).lean();
    res.json({ data: serializeBundle(updated!) });
  });

  router.delete('/:id', async (req: AuthedRequest, res) => {
    const bundle = await EngagementBundle.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!bundle) throw ApiError.notFound('Engagement bundle not found.');
    await EngagementBundle.updateOne({ _id: bundle._id }, { $set: { deletedAt: new Date(), status: 'inactive' } });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: auditRole,
      action: AUDIT_ACTIONS.ENGAGEMENT_BUNDLE_DELETE,
      targetType: 'engagementBundle',
      targetId: String(bundle._id),
      targetLabel: `${bundle.displayName} (${bundle.quantity} ${bundle.type})`,
      ip: ipFrom(req),
      metadata: { type: bundle.type, quantity: bundle.quantity },
    });
    res.json({ data: { message: 'Engagement bundle deleted.' } });
  });

  router.patch('/:id/status', validateBody(updateEngagementBundleStatusSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { status: 'active' | 'inactive' };
    const bundle = await EngagementBundle.findById(req.params.id).lean();
    if (!bundle) throw ApiError.notFound('Engagement bundle not found.');
    const patch: Record<string, unknown> = { status: body.status };
    // Re-enabling an archived bundle restores it to the catalog.
    if (body.status === 'active') patch.deletedAt = null;
    await EngagementBundle.updateOne({ _id: bundle._id }, { $set: patch });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: auditRole,
      action: AUDIT_ACTIONS.ENGAGEMENT_BUNDLE_STATUS,
      targetType: 'engagementBundle',
      targetId: String(bundle._id),
      targetLabel: `${bundle.displayName} (${bundle.quantity} ${bundle.type})`,
      ip: ipFrom(req),
      metadata: { status: body.status, previouslyDeleted: Boolean(bundle.deletedAt) },
    });
    const updated = await EngagementBundle.findById(bundle._id).lean();
    res.json({ data: serializeBundle(updated!) });
  });

  return router;
}