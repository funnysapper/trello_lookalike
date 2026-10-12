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

export const renameWorkspaceSchema = z.object({
  newName : z.string().min(1, "New workspace name is required"),
  description: z.string().optional(),
})

export const changeMemberRoleSchema = z.object({
  targetUserId: z.number(),   
  newRole: z.nativeEnum(Role, {
    message: "Role must be a valid workspace role"
  })
});

export const removeMemberSchema = z.object({
  targetUserId: z.number(),
})



export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type GetUserWorkspacesInput = z.infer<typeof getUserWorkspacesSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type RenameWorkspaceInput = z.infer<typeof renameWorkspaceSchema>;
export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
