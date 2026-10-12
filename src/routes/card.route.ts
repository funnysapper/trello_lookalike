import { Router, Request, Response, NextFunction } from 'express';
import { requireToken } from '../middleware/authWare.ts';
import { requireRole } from '../middleware/requireRole.ts';
import { validateSchema } from '../middleware/validateSchema.ts';
import { Role } from '../generated/prisma/client.ts';
import {
    createCard,
    editCard,
    deleteCard,
    changePosInCol,
    changeCardCol,
} from '../services/card.service.ts';
import {
    createCardSchema,
    editCardSchema,
    reorderCardSchema,
    moveCardSchema,
} from '../dtos/card.dto.ts';

const cardRouter = Router();

cardRouter.post(
    '/workspaces/:id/columns/:columnId/cards',
    requireToken,
    requireRole([Role.OWNER, Role.ADMIN, Role.MEMBER]),
    validateSchema(createCardSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const workspaceId = Number(req.params.id);
            const columnId = Number(req.params.columnId);
            const userId = req.user!.userId;
            const { title, description } = req.body;

            const result = await createCard(title, userId, columnId, workspaceId, description);
            res.status(201).json({ message: "Card created successfully", data: result });
        } catch (error) {
            next(error);
        }
    }
);

cardRouter.patch(
    '/workspaces/:id/cards/:cardId',
    requireToken,
    requireRole([Role.OWNER, Role.ADMIN, Role.MEMBER]),
    validateSchema(editCardSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const workspaceId = Number(req.params.id);
            const cardId = Number(req.params.cardId);
            const { title, description } = req.body;

            const result = await editCard(cardId, workspaceId, title, description);
            res.status(200).json({ message: "Card updated successfully", data: result });
        } catch (error) {
            next(error);
        }
    }
);

cardRouter.delete(
    '/workspaces/:id/cards/:cardId',
    requireToken,
    requireRole([Role.OWNER, Role.ADMIN, Role.MEMBER]),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const workspaceId = Number(req.params.id);
            const cardId = Number(req.params.cardId);

            const result = await deleteCard(cardId, workspaceId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
);

cardRouter.patch(
    '/workspaces/:id/cards/:cardId/reorder',
    requireToken,
    requireRole([Role.OWNER, Role.ADMIN, Role.MEMBER]),
    validateSchema(reorderCardSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const workspaceId = Number(req.params.id);
            const cardId = Number(req.params.cardId);
            const { columnId, newPos } = req.body;

            const result = await changePosInCol(cardId, columnId, newPos, workspaceId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
);

cardRouter.patch(
    '/workspaces/:id/cards/:cardId/move',
    requireToken,
    requireRole([Role.OWNER, Role.ADMIN, Role.MEMBER]),
    validateSchema(moveCardSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const workspaceId = Number(req.params.id);
            const cardId = Number(req.params.cardId);
            const { newColId, posIndex } = req.body;

            const result = await changeCardCol(cardId, newColId, workspaceId, posIndex);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
);

export default cardRouter;