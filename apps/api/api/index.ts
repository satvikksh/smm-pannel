import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Request, Response } from 'express';
import { getEnvironment, validateRequiredEnv } from '@smm/config';
import { connectDatabase, isConnected } from '@smm/database';
import { createApp } from '../src/app';
import { seedSuperAdmin } from '../src/seed/super-admin';
import { seedSampleData } from '../src/seed/sample-data';

/**
 * Vercel serverless entry for the SMM Panel API.
 *
 * Deployment (`vercel.json` + `@vercel/node`) bundles this file into a Lambda
 * and routes every request to it. Each warm instance lazily connects to MongoDB
 * exactly once and reuses the connection for the life of the instance.
 *
 * Local development is untouched — run `npm run dev -w @smm/api`, which starts
 * `src/index.ts` on http://localhost:4000.
 *
 * Seeding:
 *   - the Super Admin is idempotent (upsert) and required in production;
 *   - sample services/categories are NEVER inserted on Vercel.
 */
const app = createApp();

let initPromise: Promise<void> | null = null;

function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      validateRequiredEnv();
      const env = getEnvironment();
      if (!isConnected()) {
        await connectDatabase(env.mongodbUri);
      }
      await seedSuperAdmin();
      if (env.nodeEnv !== 'production') {
        await seedSampleData();
      }
    })();
  }
  return initPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await ensureInitialized();
  app(req as unknown as Request, res as unknown as Response);
}