import {z} from 'zod';
import { Role } from '../generated/prisma/client.ts';

export const createWorkspaceSchema = z.object({
    name: z.string().min(1, "Workspace name is required"),
    description: z.string().optional(),
})

export const getUserWorkspacesSchema = z.object({
    userId: z.number(),
})


export const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.nativeEnum(Role, {
    message: "Role must be a valid workspace role"
  }).optional()
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type GetUserWorkspacesInput = z.infer<typeof getUserWorkspacesSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;