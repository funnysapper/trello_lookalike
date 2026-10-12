import prisma from '../config/prisma.ts';
import { AppError } from '../middleware/error.ts';

export const createBoard = async (name: string, workspaceId: number) => {
    const newBoard = await prisma.board.create({
        data: {
            name: name,
            workspaceId: workspaceId
        }
    });

    return { message: "Board has been created successfully!", data: newBoard };
};

export const renameBoard = async (newName: string, boardId: number, workspaceId: number) => {
    const result = await prisma.board.updateMany({
        where: { id: boardId, workspaceId },
        data: { name: newName },
    });

    if (result.count === 0) {
        throw new AppError(404, "Board not found or does not belong to this workspace");
    }

    const board = await prisma.board.findUnique({ where: { id: boardId } });

    return { message: "Board has been renamed successfully!", data: board };
};

export const deleteBoard = async (boardId: number, workspaceId: number) => {
    const result = await prisma.board.deleteMany({
        where: {
            id: boardId,
            workspaceId: workspaceId
        }
    });

    if (result.count === 0) {
        throw new AppError( 404,"Board not found or does not belong to this workspace");
    }

    return { message: "Board deleted successfully!" };
};

export const viewBoard = async (workspaceId: number, boardId: number) => {
    const board = await prisma.board.findFirst({
        where: {
            id: boardId,
            workspaceId: workspaceId
        },
        include: {
            columns: {
                include: {
                    cards: true 
                }
            }
        }
    });

    if (!board) {
        throw new AppError( 404, "Board not found");
    }

    return { data: board };
};

export const viewAllBoards = async (workspaceId: number) => {
    const boards = await prisma.board.findMany({
        where: {
            workspaceId: workspaceId
        }
    });

    return { data: boards };
};