export declare function resolveRootDir(start?: string): string;
/**
 * Loads `.env` then `.env.local` (local overrides) from the monorepo root
 * into process.env. Idempotent. Priority: real exported env > .env.local > .env.
 */
export declare function loadRootEnv(): void;
export declare function getEnv(key: string): string | undefined;
export declare function requireEnv(key: string): string;
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
export declare function getEnvironment(): Environment;
export declare function validateRequiredEnv(): void;
