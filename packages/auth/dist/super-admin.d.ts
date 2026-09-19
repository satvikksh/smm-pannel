/** True only when both the email and password match the environment exactly. */
export declare function verifySuperAdminCredentials(email: string, password: string): boolean;
/** True when `email` is the configured Super Admin email (any portal). */
export declare function isSuperAdminEmail(email: string): boolean;
