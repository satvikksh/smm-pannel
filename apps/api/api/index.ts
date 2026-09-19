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
 * and routes every request to it.
 *
 * CRITICAL serverless rules honoured here:
 *   - NOTHING runs at module evaluation. `createApp()` would require
 *     environment variables, so executing it at import time could crash the
 *     Lambda on EVERY request with an opaque `FUNCTION_INVOCATION_FAILED`
 *     whenever a required env var is missing. All initialization is deferred
 *     to the first actual invocation.
 *   - A missing/invalid environment or an unreachable database returns a real
 *     JSON 500 with the exact cause (e.g. which variable is missing) — never a
 *     silent crash and never a localhost fallback.
 *   - Each warm instance validates the environment, builds the express app and
 *     connects to MongoDB exactly once; the connection and app are reused for
 *     the life of the instance.
 *
 * Local development is untouched — run `npm run dev -w @smm/api`, which starts
 * `src/index.ts` on http://localhost:4000.
 *
 * Seeding:
 *   - the Super Admin is idempotent (upsert) and required in production;
 *   - sample services/categories are NEVER inserted on Vercel.
 */

let app: ReturnType<typeof createApp> | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Validate env, build the express app and connect the database. A rejection
 * resets the promise so a corrected environment/DB recovers on a later request.
 */
function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      // 1. Configuration is validated BEFORE the app is built so that a missing
      //    variable is reported with its name, not as an import-time crash.
      validateRequiredEnv();
      const env = getEnvironment();
      if (!app) app = createApp();
      // 2. Database + required seed data.
      if (!isConnected()) {
        await connectDatabase(env.mongodbUri);
      }
      await seedSuperAdmin();
      if (env.nodeEnv !== 'production') {
        await seedSampleData();
      }
    })().catch((err: unknown) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

function isConfigurationError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('Missing required environment variable') || message.includes('Configuration error');
}

function isDatabaseError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /Mongo|server selection|ECONNREFUSED|ENOTFOUND|Topology|could not connect|mongoose/i.test(message);
}

// Vercel-hosted panel origins the serverless error path can always accept,
// independent of environment variables. Mirrors the origin(s) that the express
// `cors()` middleware would accept in a healthy deploy, so that even a
// degraded instance (missing env / unreachable DB) answers preflights and
// issues CORS headers for the real panels. Credentials are only ever reflected
// for an explicit origin — never a wildcard.
const STATIC_OPEN_ORIGINS = new Set([
  'https://smm-pannel-user.vercel.app',
  'https://smm-pannel-admin.vercel.app',
  'https://smmsupadmin.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
]);

function originIsAllowed(origin: unknown): boolean {
  return typeof origin === 'string' && STATIC_OPEN_ORIGINS.has(origin);
}

function applyStaticCorsHeaders(req: VercelRequest, res: VercelResponse): void {
  const origin = req.headers.origin;
  if (typeof origin !== 'string') return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Preflight for a known panel origin is answered independently of app init so
  // the browser can reach the real request and receive the JSON cause below.
  if (req.method === 'OPTIONS' && originIsAllowed(req.headers.origin)) {
    const requestedHeaders = req.headers['access-control-request-headers'];
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin as string);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    if (typeof requestedHeaders === 'string') {
      res.setHeader('Access-Control-Allow-Headers', requestedHeaders);
      res.setHeader('Vary', 'Origin, Access-Control-Request-Headers');
    } else {
      res.setHeader('Vary', 'Origin');
    }
    res.end();
    return;
  }

  try {
    await ensureInitialized();
    if (!app) {
      throw new Error('API app failed to initialize.');
    }
    app(req as unknown as Request, res as unknown as Response);
  } catch (err) {
    if (res.headersSent) {
      res.end();
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    const code = isConfigurationError(err) ? 'configuration_error' : isDatabaseError(err) ? 'database_unavailable' : 'init_failed';
    if (originIsAllowed(req.headers.origin)) {
      applyStaticCorsHeaders(req, res);
    }
    // Framework-neutral error responder: the express app may not exist yet when
    // configuration validation fails, so never rely on Express res helpers here.
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code, message } }));
  }
}