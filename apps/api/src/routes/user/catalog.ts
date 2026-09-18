import { Router } from 'express';
import { Category, Service } from '@smm/database';
import type { Service as ServiceEntity } from '@smm/types';

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

  return router;
}