import type { Role } from '@smm/types';
/** Cookie names are role-scoped so each application owns its own session. */
export declare const COOKIE_NAMES: Record<Role, {
    access: string;
    refresh: string;
}>;
export declare function cookieNamesFor(role: Role): {
    access: string;
    refresh: string;
};
export interface CookieOptions {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    path: string;
    domain?: string;
}
export declare function buildCookieOptions(env: {
    nodeEnv: string;
    apiBaseUrl: string;
}): CookieOptions;
export declare const ACCESS_COOKIE_MAX_AGE: number;
