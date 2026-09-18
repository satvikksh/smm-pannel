import { Router } from 'express';
import { AuditLog } from '@smm/database';
import { paginationSchema } from '@smm/types';
import { validateQuery } from '../../middleware/validate';
import { serializeAuditLog } from '../../helpers/transform';

export function superAdminAuditLogsRouter(): Router {
  const router = Router();

  router.get(
    '/',
    validateQuery(
      paginationSchema.extend({
        actorRole: paginationSchema.shape.search,
        action: paginationSchema.shape.search,
      }),
    ),
    async (_req, res) => {
      const q = res.locals.query as { page: number; limit: number; search?: string; actorRole?: string; action?: string };
      const filter: Record<string, unknown> = {};
      if (q.actorRole) filter.actorRole = q.actorRole;
      if (q.action) filter.action = q.action;
      if (q.search) {
        const rx = new RegExp(q.search, 'i');
        filter.$or = [{ actorName: rx }, { targetLabel: rx }, { action: rx }];
      }
      const total = await AuditLog.countDocuments(filter);
      const logs = await AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .lean();
      res.json({
        data: {
          items: logs.map(serializeAuditLog),
          total,
          page: q.page,
          limit: q.limit,
          totalPages: Math.max(1, Math.ceil(total / q.limit)),
        },
      });
    },
  );

  return router;
}