import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { getEnvironment } from '@smm/config';
import { errorHandler, notFound } from './middleware/error-handler';
import { apiRouter } from './routes';
import { googleAuthRouter } from './routes/auth/google';
import { adminGoogleAuthRouter } from './routes/auth/google-admin';

/** Vercel-hosted panel origins that the API must always accept (production). */
const PRODUCTION_PANEL_ORIGINS = [
  'https://smm-pannel-user.vercel.app',
  'https://smm-pannel-admin.vercel.app',
  'https://smmsupadmin.vercel.app',
] as const;

function parseCorsOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createApp(): express.Express {
  const env = getEnvironment();
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Production panels live on their own Vercel domains (smm-pannel-user.vercel.app,
  // smm-pannel-admin.vercel.app, smmsupadmin.vercel.app); local panels run on
  // localhost:3000-3002. Cookies carry credentials, so CORS must be an explicit
  // allow-list — never a wildcard. The three production panel origins are always
  // accepted irrespective of env vars; API_CORS_ORIGINS and the panel app URLs
  // extend the list (e.g. when custom domains are added).
  const allowedOrigins = new Set<string>();
  for (const origin of [
    ...PRODUCTION_PANEL_ORIGINS,
    env.userAppUrl,
    env.adminAppUrl,
    env.superAdminAppUrl,
    ...parseCorsOrigins(env.apiCorsOrigins),
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
  ]) {
    if (origin) allowedOrigins.add(origin);
  }

  // Admin panels are served from per-admin subdomains (e.g.
  // `ram-kumar.smmpannel.com` or `ram-kumar.localhost`), so any host that is a
  // subdomain of the configured root domain must pass CORS as well. This only
  // whitelists origins — authentication and tenant isolation are still enforced
  // server-side on every request.
  function isRootSubdomainOrigin(origin: string): boolean {
    try {
      const hostname = new URL(origin).hostname.toLowerCase();
      if (hostname === 'localhost') return true;
      const root = env.rootDomain.toLowerCase();
      return hostname === root || hostname.endsWith(`.${root}`);
    } catch {
      return false;
    }
  }

  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin / non-browser requests as well as the known panels
        // and any admin subdomain of the configured root domain.
        if (!origin || allowedOrigins.has(origin) || isRootSubdomainOrigin(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser(env.cookieSecret));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'smm-panel-api' });
  });
  app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'smm-panel-api', version: '1.0.0' });
  });

  app.use('/api/auth', googleAuthRouter());
  app.use('/api/auth', adminGoogleAuthRouter());
  app.use('/api/v1', apiRouter());

  app.use(notFound);
  app.use(errorHandler);

  return app;
}