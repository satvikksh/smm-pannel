import { Router } from 'express';
import { Category, EngagementBundle, Service } from '@smm/database';
import type {
  EngagementBundleCatalog,
  EngagementBundlePublic,
  Service as ServiceEntity,
} from '@smm/types';

export function userCatalogRouter(): Router {
  const router = Router();

  router.get('/categories', async (_req, res) => {
    const categories = await Category.find({ status: 'active' }).sort({ sortOrder: 1 }).lean();
    res.json({ data: categories });
  });

  router.get('/services', async (_req, res) => {
    const [services, categories] = await Promise.all([
      Service.find({ status: 'active' }).sort({ createdAt: 1 }).lean(),
      Category.find({ status: 'active' }).lean(),
    ]);
    const categoryMap = new Map(categories.map((c) => [String(c._id), c.name]));
    const items: ServiceEntity[] = services.map((s) => ({
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
    }));
    res.json({ data: items });
  });

  /**
   * Engagement pricing catalog. Only ACTIVE, non-archived bundles are exposed,
   * grouped by type. Price/quantity come straight from the database — the
   * customer never supplies them.
   */
  router.get('/bundles', async (_req, res) => {
    const bundles = await EngagementBundle.find({ status: 'active', deletedAt: null })
      .sort({ sortOrder: 1, quantity: 1 })
      .lean();
    const catalog: EngagementBundleCatalog = { likes: [], views: [], subscribers: [] };
    for (const bundle of bundles) {
      const item: EngagementBundlePublic = {
        id: String(bundle._id),
        type: bundle.type,
        quantity: bundle.quantity,
        price: bundle.price,
        currency: bundle.currency,
        displayName: bundle.displayName,
        description: bundle.description,
        sortOrder: bundle.sortOrder,
      };
      catalog[bundle.type].push(item);
    }
    res.json({ data: catalog });
  });

  return router;
}