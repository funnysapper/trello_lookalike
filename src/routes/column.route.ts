import { Router, Request, Response, NextFunction } from 'express';
import { requireToken } from '../middleware/authWare.ts';
import { requireRole } from '../middleware/requireRole.ts';
import { validateSchema } from '../middleware/validateSchema.ts';
import { Role } from '../generated/prisma/client.ts';
import {
    createColumn,
    renameColumn,
    deleteColumn,
    viewColumns,
    reorderColumns,
} from '../services/column.service.ts';
import {
    createColumnSchema,
    renameColumnSchema,
    reorderSchema,
} from '../dtos/column.dto.ts';

const columnRouter = Router();

columnRouter.post(
    '/workspaces/:id/boards/:boardId/columns',
    requireToken,
    requireRole([Role.OWNER, Role.ADMIN, Role.MEMBER]),
    validateSchema(createColumnSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const workspaceId = Number(req.params.id);
            const boardId = Number(req.params.boardId);
            const { name } = req.body;

            const result = await createColumn(name, boardId, workspaceId);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }
);

columnRouter.get(
    '/workspaces/:id/boards/:boardId/columns',
    requireToken,
    requireRole([Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const workspaceId = Number(req.params.id);
            const boardId = Number(req.params.boardId);

            const result = await viewColumns(boardId, workspaceId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
);

columnRouter.patch(
    '/workspaces/:id/boards/:boardId/columns/:columnId',
    requireToken,
    requireRole([Role.OWNER, Role.ADMIN, Role.MEMBER]),
    validateSchema(renameColumnSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const workspaceId = Number(req.params.id);
            const boardId = Number(req.params.boardId);
            const columnId = Number(req.params.columnId);
            const { name } = req.body;

            const result = await renameColumn(name, boardId, columnId, workspaceId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
);

columnRouter.delete(
    '/workspaces/:id/boards/:boardId/columns/:columnId',
    requireToken,
    requireRole([Role.OWNER, Role.ADMIN, Role.MEMBER]),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const workspaceId = Number(req.params.id);
            const boardId = Number(req.params.boardId);
            const columnId = Number(req.params.columnId);

            const result = await deleteColumn(columnId, boardId, workspaceId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
);

columnRouter.patch(
    '/workspaces/:id/boards/:boardId/columns/:columnId/reorder',
    requireToken,
    requireRole([Role.OWNER, Role.ADMIN, Role.MEMBER]),
    validateSchema(reorderSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const workspaceId = Number(req.params.id);
            const boardId = Number(req.params.boardId);
            const columnId = Number(req.params.columnId);
            const { newIndex } = req.body;

            const result = await reorderColumns(columnId, boardId, workspaceId, newIndex);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
);

export default columnRouter;