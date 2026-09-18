import { Router } from 'express';
import { PlatformSetting } from '@smm/database';
import {
  ROLES,
  AUDIT_ACTIONS,
  updateSettingsSchema,
  upsertSettingSchema,
} from '@smm/types';
import { ipFrom, writeAuditLog, type AuthedRequest } from '@smm/auth';
import { validateBody } from '../../middleware/validate';
import { buildPublicSettings } from '../../helpers/transform';

function normalize(v: string): unknown {
  const lower = v.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

export function superAdminSettingsRouter(): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json({ data: await buildPublicSettings() });
  });

  router.patch('/', validateBody(updateSettingsSchema), async (req: AuthedRequest, res) => {
    const body = req.body as Record<string, unknown>;
    for (const [key, value] of Object.entries(body)) {
      await PlatformSetting.updateOne(
        { key },
        { $set: { value, updatedBy: req.ctx.user._id } },
        { upsert: true },
      );
    }
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.SETTING_UPDATE,
      targetType: 'settings',
      targetId: 'platform',
      targetLabel: 'Platform settings',
      ip: ipFrom(req),
      metadata: { fields: Object.keys(body) },
    });
    res.json({ data: await buildPublicSettings() });
  });

  router.post('/upsert', validateBody(upsertSettingSchema), async (req: AuthedRequest, res) => {
    const body = req.body as { key: string; value: unknown };
    const value = typeof body.value === 'string' ? normalize(body.value) : body.value;
    await PlatformSetting.updateOne(
      { key: body.key },
      { $set: { value, updatedBy: req.ctx.user._id } },
      { upsert: true },
    );
    await writeAuditLog({
      actorId: String(req.ctx.user._id),
      actorName: req.ctx.user.name,
      actorRole: ROLES.SUPER_ADMIN,
      action: AUDIT_ACTIONS.SETTING_UPDATE,
      targetType: 'settings',
      targetId: body.key,
      ip: ipFrom(req),
    });
    res.json({ data: { key: body.key, value } });
  });

  return router;
}