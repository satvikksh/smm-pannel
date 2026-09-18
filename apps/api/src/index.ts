/* eslint-disable no-console */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { getEnvironment, loadRootEnv, validateRequiredEnv } from '@smm/config';
import { connectDatabase } from '@smm/database';
import { seedSuperAdmin } from '@smm/auth';
import { createApp } from './app';
import { seedSampleData } from './seed/sample-data';

// ESM-safe equivalent of `require.main === module` (package is "type": "module").
const isMain =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

export async function start(port: number, environment = getEnvironment()): Promise<void> {
  if (isMain) {
    validateRequiredEnv();
    console.log('[api] environment validated.');
  }

  await connectDatabase(environment.mongodbUri);
  if (isMain) {
    await seedSuperAdmin(environment.superAdminEmail, environment.superAdminPassword);
    await seedSampleData();
    console.log('[api] database connected and seeded (super admin + sample data).');
  }

  const app = createApp();
  return new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.log(`[api] listening on :${port}`);
      resolve();
    });
  });
}

// Top-level load so the env files are present before anything reads process.env.
loadRootEnv();

if (isMain) {
  const port = Number(process.env.PORT) || 4000;
  start(port).catch((err) => {
    console.error('[api] failed to start:', err);
    process.exit(1);
  });
}