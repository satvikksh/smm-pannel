import { z } from 'zod';
export declare const createCategorySchema: z.ZodObject<{
    name: z.ZodString;
    icon: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["active", "inactive"]>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "inactive";
    sortOrder: number;
    name: string;
    icon: string;
}, {
    name: string;
    status?: "active" | "inactive" | undefined;
    sortOrder?: number | undefined;
    icon?: string | undefined;
}>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export declare const updateCategorySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodEnum<["active", "inactive"]>>>>;
    sortOrder: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodNumber>>>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "inactive" | undefined;
    sortOrder?: number | undefined;
    name?: string | undefined;
    icon?: string | undefined;
}, {
    status?: "active" | "inactive" | undefined;
    sortOrder?: number | undefined;
    name?: string | undefined;
    icon?: string | undefined;
}>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export declare const createServiceSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodString;
    categoryId: z.ZodString;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    price: z.ZodNumber;
    minOrder: z.ZodNumber;
    maxOrder: z.ZodNumber;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["active", "inactive"]>>>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "inactive";
    price: number;
    description: string;
    name: string;
    categoryId: string;
    minOrder: number;
    maxOrder: number;
}, {
    price: number;
    name: string;
    categoryId: string;
    minOrder: number;
    maxOrder: number;
    status?: "active" | "inactive" | undefined;
    description?: string | undefined;
}>, {
    status: "active" | "inactive";
    price: number;
    description: string;
    name: string;
    categoryId: string;
    minOrder: number;
    maxOrder: number;
}, {
    price: number;
    name: string;
    categoryId: string;
    minOrder: number;
    maxOrder: number;
    status?: "active" | "inactive" | undefined;
    description?: string | undefined;
}>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export declare const updateServiceSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    price: z.ZodOptional<z.ZodNumber>;
    minOrder: z.ZodOptional<z.ZodNumber>;
    maxOrder: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "inactive" | undefined;
    price?: number | undefined;
    description?: string | undefined;
    name?: string | undefined;
    categoryId?: string | undefined;
    minOrder?: number | undefined;
    maxOrder?: number | undefined;
}, {
    status?: "active" | "inactive" | undefined;
    price?: number | undefined;
    description?: string | undefined;
    name?: string | undefined;
    categoryId?: string | undefined;
    minOrder?: number | undefined;
    maxOrder?: number | undefined;
}>, {
    status?: "active" | "inactive" | undefined;
    price?: number | undefined;
    description?: string | undefined;
    name?: string | undefined;
    categoryId?: string | undefined;
    minOrder?: number | undefined;
    maxOrder?: number | undefined;
}, {
    status?: "active" | "inactive" | undefined;
    price?: number | undefined;
    description?: string | undefined;
    name?: string | undefined;
    categoryId?: string | undefined;
    minOrder?: number | undefined;
    maxOrder?: number | undefined;
}>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
