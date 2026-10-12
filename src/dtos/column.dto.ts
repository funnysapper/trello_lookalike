import { z } from 'zod';

export const createColumnSchema = z.object({
    name: z.string().min(1).max(100),
});

export const renameColumnSchema = z.object({
    name: z.string().min(1).max(100),
});

export const reorderSchema = z.object({
    newIndex: z.number().int().min(0),
});

export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type RenameColumnInput = z.infer<typeof renameColumnSchema>;
export type ReorderColumnInput = z.infer<typeof reorderSchema>;