import { z } from 'zod';

export const createCardSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
});

export const editCardSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
});

export const reorderCardSchema = z.object({
    columnId: z.number().int().positive(),
    newPos: z.number().int().min(0),
});

export const moveCardSchema = z.object({
    newColId: z.number().int().positive(),
    posIndex: z.number().int().min(0),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type EditCardInput = z.infer<typeof editCardSchema>;
export type ReorderCardInput = z.infer<typeof reorderCardSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;