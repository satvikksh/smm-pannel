import { beforeAll, afterAll, beforeEach } from 'vitest';
import { connectDatabase, disconnectDatabase, mongoose } from '@smm/database';
import { loadRootEnv } from '@smm/config';
import { seedSuperAdmin } from '@smm/auth';
import { resetRateLimits } from '../middleware/rate-limit';
import { seedSampleData } from '../seed/sample-data';

const TEST_DB_URI = (process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/smm_panel_test');

// Must run BEFORE any getEnvironment() call so the root .env does not override it.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = TEST_DB_URI;
loadRootEnv();

beforeAll(async () => {
  await connectDatabase(TEST_DB_URI);
  await mongoose.connection.dropDatabase();
  await seedSuperAdmin(
    process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@localhost.test',
    process.env.SUPER_ADMIN_PASSWORD ?? 'Sa$ecret!2026#Super',
  );
  await seedSampleData();
}, 40_000);

afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => undefined);
  await disconnectDatabase();
});

beforeEach(() => {
  resetRateLimits();
});