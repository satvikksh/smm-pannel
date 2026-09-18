import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

let rootDir: string | null = null;
let loaded = false;

function isRootCandidate(dir: string): boolean {
  return existsSync(join(dir, '.env')) || existsSync(join(dir, 'turbo.json')) || existsSync(join(dir, 'pnpm-workspace.yaml'));
}

export function resolveRootDir(start?: string): string {
  if (rootDir) return rootDir;
  const dir = resolve(start ?? process.cwd());
  const parts = dir.split(sep).filter(Boolean);
  for (let i = parts.length; i >= 0; i -= 1) {
    const candidate = sep + parts.slice(0, i).join(sep);
    if (candidate && existsSync(join(candidate, 'package.json')) && isRootCandidate(candidate)) {
      rootDir = candidate;
      return rootDir;
    }
  }
  throw new Error(
    `[smm/config] Could not locate the monorepo root (.env / turbo.json) starting from "${dir}". ` +
      `Run commands from inside the repo.`,
  );
}

/**
 * Loads `.env` then `.env.local` (local overrides) from the monorepo root
 * into process.env. Idempotent. Priority: real exported env > .env.local > .env.
 */
export function loadRootEnv(): void {
  if (loaded) return;
  const root = resolveRootDirOrNull();
  loaded = true;
  if (!root) return;

  const baseFile = join(root, '.env');
  const localFile = join(root, '.env.local');

  const merged: Record<string, string> = {};
  if (existsSync(baseFile)) {
    Object.assign(merged, parseEnv(readFileSync(baseFile, 'utf8')));
  }
  if (existsSync(localFile)) {
    Object.assign(merged, parseEnv(readFileSync(localFile, 'utf8')));
  }
  // Priority: a real exported process env wins; otherwise .env.local (which
  // overrides .env) fills the gap.
  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key]) {
      continue;
    }
    process.env[key] = value;
  }
}

/**
 * Like {@link resolveRootDir} but does NOT throw when the monorepo root files
 * are absent. This matters on Vercel/Vercel Functions: the bundle directory has
 * no `.env`/`turbo.json`, and configuration must come entirely from the process
 * environment that Vercel injects per project.
 */
function resolveRootDirOrNull(): string | null {
  try {
    return resolveRootDir();
  } catch {
    return null;
  }
}

export function getEnv(key: string): string | undefined {
  loadRootEnv();
  return process.env[key];
}

export function requireEnv(key: string): string {
  const value = getEnv(key);
  if (!value) {
    throw new Error(
      `[smm/config] Missing required environment variable: ${key}. ` +
        `Set it in the root .env / .env.local file.`,
    );
  }
  return value;
}

export interface Environment {
  mongodbUri: string;
  nodeEnv: string;
  apiPort: number;
  apiBaseUrl: string;
  superAdminEmail: string;
  superAdminPassword: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtl: string;
  jwtRefreshTtlDays: number;
  cookieSecret: string;
  userAppUrl: string;
  adminAppUrl: string;
  superAdminAppUrl: string;
  rootDomain: string;
  /** Google OAuth client id (User panel only). Empty when Google auth is disabled. */
  googleClientId: string;
  /** Google OAuth client secret (server only, never exposed to browsers). */
  googleClientSecret: string;
  /** Absolute Google OAuth redirect (callback) URI. */
  googleRedirectUri: string;
  /**
   * Extra comma-separated CORS origins accepted by the API in addition to the
   * three panel app URLs and localhost development origins. Empty by default.
   */
  apiCorsOrigins: string;
}

function number(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`[smm/config] Environment variable ${name} must be a number. Got: "${value}"`);
  }
  return n;
}

export function getEnvironment(): Environment {
  return {
    mongodbUri: requireEnv('MONGODB_URI'),
    nodeEnv: getEnv('NODE_ENV') ?? 'development',
    apiPort: number(getEnv('API_PORT'), 4000, 'API_PORT'),
    apiBaseUrl: getEnv('API_BASE_URL') ?? 'http://localhost:4000',
    superAdminEmail: requireEnv('SUPER_ADMIN_EMAIL'),
    superAdminPassword: requireEnv('SUPER_ADMIN_PASSWORD'),
    jwtAccessSecret: requireEnv('JWT_ACCESS_SECRET'),
    jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    jwtAccessTtl: getEnv('JWT_ACCESS_TTL') ?? '15m',
    jwtRefreshTtlDays: number(getEnv('JWT_REFRESH_TTL_DAYS'), 30, 'JWT_REFRESH_TTL_DAYS'),
    cookieSecret: requireEnv('COOKIE_SECRET'),
    userAppUrl: getEnv('NEXT_PUBLIC_USER_APP_URL') ?? 'http://localhost:3000',
    adminAppUrl: getEnv('NEXT_PUBLIC_ADMIN_APP_URL') ?? 'http://localhost:3001',
    superAdminAppUrl: getEnv('NEXT_PUBLIC_SUPER_ADMIN_APP_URL') ?? 'http://localhost:3002',
    rootDomain: getEnv('NEXT_PUBLIC_ROOT_DOMAIN') ?? getEnv('ROOT_DOMAIN') ?? 'localhost',
    googleClientId: getEnv('GOOGLE_CLIENT_ID') ?? '',
    googleClientSecret: getEnv('GOOGLE_CLIENT_SECRET') ?? '',
    googleRedirectUri: getEnv('GOOGLE_REDIRECT_URI') ?? '',
    apiCorsOrigins: getEnv('API_CORS_ORIGINS') ?? '',
  };
}

export function validateRequiredEnv(): void {
  const required = [
    'MONGODB_URI',
    'SUPER_ADMIN_EMAIL',
    'SUPER_ADMIN_PASSWORD',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'COOKIE_SECRET',
  ] as const;
  const missing = required.filter((key) => {
    const value = getEnv(key);
    return !value || value === '';
  });
  if (missing.length > 0) {
    throw new Error(
      `[smm/api] Configuration error. The following required environment variables are missing:\n` +
        `  - ${missing.join('\n  - ')}\n` +
        `Set them in the root .env / .env.local file. Values are validated, never printed.\n`,
    );
  }

  const weak = (getEnv('SUPER_ADMIN_PASSWORD') ?? '').length < 8;
  if (weak) {
    throw new Error(
      '[smm/api] Configuration error. SUPER_ADMIN_PASSWORD must be at least 8 characters.',
    );
  }
}