import { Router, Request, Response, NextFunction } from 'express';
import {
    createBoard,
    renameBoard,
    deleteBoard,
    viewBoard,
    viewAllBoards
} from '../services/board.service.ts'; 
import { requireToken } from '../middleware/authWare.ts';
import { Role } from '../generated/prisma/client.ts';
import { requireRole } from '../middleware/requireRole.ts';

const boardRouter = Router({ mergeParams: true });


boardRouter.post('/workspaces/:id/boards',requireToken, requireRole([Role.OWNER, Role.ADMIN,Role.MEMBER]), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = Number(req.params.id);
        const { name } = req.body;

        const result = await createBoard(name, workspaceId);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

boardRouter.get('/workspaces/:id/boards',requireToken, requireRole([Role.OWNER, Role.ADMIN,Role.MEMBER,Role.VIEWER]), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = Number(req.params.id);

        const result = await viewAllBoards(workspaceId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

boardRouter.get('/workspaces/:id/boards/:boardId', requireToken, requireRole([Role.OWNER, Role.ADMIN,Role.MEMBER,Role.VIEWER]), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = Number(req.params.id);
        const boardId = Number(req.params.boardId);

        const result = await viewBoard(workspaceId, boardId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

boardRouter.patch('/workspaces/:id/boards/:boardId',requireToken, requireRole([Role.OWNER, Role.ADMIN,Role.MEMBER]), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = Number(req.params.id);
        const boardId = Number(req.params.boardId);
        const { name } = req.body;

        const result = await renameBoard(name, boardId, workspaceId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

boardRouter.delete('/workspaces/:id/boards/:boardId', requireToken, requireRole([Role.OWNER,Role.ADMIN]), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = Number(req.params.id);
        const boardId = Number(req.params.boardId);

        const result = await deleteBoard(boardId, workspaceId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

export default boardRouter;