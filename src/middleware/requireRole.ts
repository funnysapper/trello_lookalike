import { Request, Response, NextFunction } from 'express';
import {Role} from '../generated/prisma/client.ts';
import {AppError} from './error.ts';
import prisma from '../config/prisma.ts';

export function requireRole(allowedRoles: Role[]) {
  return async (req: Request, _: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) throw new AppError(401, "No user object found!");

      const userId = Number(user.userId);
      const workspaceId = Number(req.params.id);

      if (Number.isNaN(workspaceId)) {
        throw new AppError(400, "No workspace id provided");
      }

      const member = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
        select: { role: true },
      });

      if (!member) {
        throw new AppError(403, "You are not a member of this workspace");
      }

      if (!allowedRoles.includes(member.role)) {
        throw new AppError(403, "You do not have permission to perform this action");
      }

      req.membership = member.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}