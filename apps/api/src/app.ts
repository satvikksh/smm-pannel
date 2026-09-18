import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { getEnvironment } from '@smm/config';
import { errorHandler, notFound } from './middleware/error-handler';
import { apiRouter } from './routes';
import { googleAuthRouter } from './routes/auth/google';

export function createApp(): express.Express {
  const env = getEnvironment();
  const app = express();
  app.disable('x-powered-by');

  const allowedOrigins = [env.userAppUrl, env.adminAppUrl, env.superAdminAppUrl];

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
        // Allow same-origin / non-browser requests as well as the three apps
        // and any admin subdomain of the configured root domain.
        if (!origin || allowedOrigins.includes(origin) || isRootSubdomainOrigin(origin)) {
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
  app.use('/api/v1', apiRouter());

  app.use(notFound);
  app.use(errorHandler);

  return app;
}