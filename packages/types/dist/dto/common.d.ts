import { z } from 'zod';
export declare const idSchema: z.ZodString;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    sort: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    search: string;
    sort?: string | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    sort?: string | undefined;
}>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export declare function paginated<T>(items: T[], total: number, page: number, limit: number): {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};
export declare const passwordSchema: z.ZodString;
