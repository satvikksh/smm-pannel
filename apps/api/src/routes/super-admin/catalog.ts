import { Router } from 'express';
import { z } from 'zod';
import { Category, Service } from '@smm/database';
import {
  ApiError,
  AUDIT_ACTIONS,
  createCategorySchema,
  createServiceSchema,
  paginationSchema,
  updateCategorySchema,
  updateServiceSchema,
  type Role,
} from '@smm/types';
import { ipFrom, writeAuditLog, type AuthedRequest } from '@smm/auth';
import { validateBody, validateQuery } from '../../middleware/validate';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildCategoriesRouter(auditRole: Role): Router {
  const router = Router();

  router.get('/all', async (_req, res) => {
    const categories = await Category.find({}).sort({ sortOrder: 1 }).lean();
    res.json({ data: categories });
  });

  router.get('/', validateQuery(paginationSchema), async (req, res) => {
    const q = res.locals.query as { page: number; limit: number; search?: string };
    const filter: Record<string, unknown> = {};
    if (q.search) filter.name = new RegExp(q.search, 'i');
    const total = await Category.countDocuments(filter);
    const items = await Category.find(filter)
      .sort({ sortOrder: 1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean();
    res.json({ data: { items, total, page: q.page, limit: q.limit, totalPages: Math.max(1, Math.ceil(total / q.limit)) } });
  });

  router.post('/', validateBody(createCategorySchema), async (req: AuthedRequest, res) => {
    const body = req.body as { name: string; icon?: string; status?: string; sortOrder?: number };
    const slug = slugify(body.name);
    if (await Category.exists({ slug })) throw ApiError.conflict('A category with this name already exists.');
    const category = await Category.create({
      name: body.name,
      slug,
      icon: body.icon ?? 'grid',
      status: body.status ?? 'active',
      sortOrder: body.sortOrder ?? 0,
    });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: auditRole,
      action: AUDIT_ACTIONS.CATEGORY_CREATE,
      targetType: 'category',
      targetId: String(category._id),
      targetLabel: category.name,
      ip: ipFrom(req),
    });
    res.status(201).json({ data: category });
  });

  router.patch('/:id', validateBody(updateCategorySchema), async (req: AuthedRequest, res) => {
    const body = req.body as { name?: string; icon?: string; status?: string; sortOrder?: number; slug?: string };
    const category = await Category.findById(req.params.id).lean();
    if (!category) throw ApiError.notFound('Category not found.');
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) {
      patch.name = body.name;
      const slug = body.slug && body.slug.trim() ? slugify(body.slug) : slugify(body.name);
      patch.slug = slug;
      if (slug !== category.slug && (await Category.exists({ slug }))) {
        throw ApiError.conflict('A category with this name already exists.');
      }
    }
    if (body.icon !== undefined) patch.icon = body.icon;
    if (body.status !== undefined) patch.status = body.status;
    if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;
    await Category.updateOne({ _id: category._id }, { $set: patch });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: auditRole,
      action: AUDIT_ACTIONS.CATEGORY_UPDATE,
      targetType: 'category',
      targetId: String(category._id),
      targetLabel: category.name,
      ip: ipFrom(req),
    });
    const updated = await Category.findById(category._id).lean();
    res.json({ data: updated });
  });

  return router;
}

export function buildServicesRouter(auditRole: Role): Router {
  const router = Router();

  router.get(
    '/',
    validateQuery(
      paginationSchema.extend({
        categoryId: z.string().trim().optional(),
        status: z.enum(['active', 'inactive']).optional(),
      }),
    ),
    async (req, res) => {
      const q = res.locals.query as { page: number; limit: number; search?: string; categoryId?: string; status?: string };
      const filter: Record<string, unknown> = {};
      if (q.categoryId) filter.categoryId = q.categoryId;
      if (q.status) filter.status = q.status;
      if (q.search) filter.name = new RegExp(q.search, 'i');
      const total = await Service.countDocuments(filter);
      const services = await Service.find(filter)
        .sort({ createdAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .lean();
      const categoryIds = [...new Set(services.map((s) => String(s.categoryId)))];
      const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
      const categoryMap = new Map(categories.map((c) => [String(c._id), c.name]));
      res.json({
        data: {
          items: services.map((s) => ({
            id: String(s._id),
            name: s.name,
            categoryId: String(s.categoryId),
            categoryName: categoryMap.get(String(s.categoryId)) ?? '',
            description: s.description,
            price: s.price,
            minOrder: s.minOrder,
            maxOrder: s.maxOrder,
            status: s.status,
            createdAt: s.createdAt.toISOString(),
            updatedAt: s.updatedAt.toISOString(),
          })),
          total,
          page: q.page,
          limit: q.limit,
          totalPages: Math.max(1, Math.ceil(total / q.limit)),
        },
      });
    },
  );

  router.post('/', validateBody(createServiceSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { name: string; categoryId: string; description?: string; price: number; minOrder: number; maxOrder: number; status?: string };
    if (!(await Category.exists({ _id: body.categoryId }))) {
      throw ApiError.badRequest('Category does not exist.');
    }
    const service = await Service.create({
      name: body.name,
      categoryId: body.categoryId,
      description: body.description ?? '',
      price: body.price,
      minOrder: body.minOrder,
      maxOrder: body.maxOrder,
      status: body.status ?? 'active',
    });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: auditRole,
      action: AUDIT_ACTIONS.SERVICE_CREATE,
      targetType: 'service',
      targetId: String(service._id),
      targetLabel: service.name,
      ip: ipFrom(req),
    });
    res.status(201).json({ data: { id: String(service._id), name: service.name } });
  });

  router.patch('/:id', validateBody(updateServiceSchema), async (req: AuthedRequest, res) => {
    const body = req.body as Record<string, unknown>;
    const service = await Service.findById(req.params.id).lean();
    if (!service) throw ApiError.notFound('Service not found.');
    await Service.updateOne({ _id: service._id }, { $set: body });
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: auditRole,
      action: AUDIT_ACTIONS.SERVICE_UPDATE,
      targetType: 'service',
      targetId: String(service._id),
      targetLabel: service.name,
      ip: ipFrom(req),
      metadata: { fields: Object.keys(body) },
    });
    const updated = await Service.findById(service._id).lean();
    res.json({ data: { id: String(updated!._id), name: updated!.name, status: updated!.status } });
  });

  return router;
}