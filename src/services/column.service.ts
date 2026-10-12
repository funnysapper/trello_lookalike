import prisma from "../config/prisma.ts";
import { AppError } from "../middleware/error.ts";

export const createColumn = async (name: string, boardId: number, workspaceId: number) => {
    const board = await prisma.board.findFirst({
        where: { id: boardId, workspaceId },
        select: { id: true },
    });

    if (!board) {
        throw new AppError(404, "Board not found or does not belong to this workspace");
    }

    const newColumn = await prisma.column.create({
        data: { name, boardId, position: 0 },
    });

    const updatedColumn = await prisma.column.update({
        where: { id: newColumn.id },
        data: { position: newColumn.id * 1000 },
    });

    return { message: "Column has been created successfully!", data: updatedColumn };
};

export const renameColumn = async (newName: string, boardId: number, columnId: number, workspaceId: number) => {
    const result = await prisma.column.updateMany({
        where: {
            id: columnId,
            boardId,
            board: { workspaceId },
        },
        data: { name: newName },
    });

    if (result.count === 0) {
        throw new AppError(404, "This column does not exist or does not belong to this board");
    }

    return { message: "Column has successfully been renamed" };
};

export const deleteColumn = async (columnId: number, boardId: number, workspaceId: number) => {
    const deletedColumn = await prisma.column.deleteMany({
        where: {
            id: columnId,
            boardId,
            board: { workspaceId },
        },
    });

    if (deletedColumn.count === 0) {
        throw new AppError(404, "This column does not exist or does not belong to this board");
    }

    return { message: "Column successfully deleted" };
};

export const viewColumns = async (boardId: number, workspaceId: number) => {
    const allColumns = await prisma.column.findMany({
        where: {
            boardId,
            board: { workspaceId },
        },
        orderBy: { position: 'asc' },
    });

    return { data: allColumns };
};

export const reorderColumns = async (columnId: number, boardId: number, workspaceId: number, newIndex: number) => {
    const columns = await prisma.column.findMany({
        where: {
            boardId,
            board: { workspaceId },
        },
        orderBy: { position: 'asc' },
    });

    const movingColumnIndex = columns.findIndex(c => c.id === columnId);
    if (movingColumnIndex === -1) {
        throw new AppError(404, "Column not found on this board");
    }

    const [movingColumn] = columns.splice(movingColumnIndex, 1);

    const prevColumn = columns[newIndex - 1];
    const nextColumn = columns[newIndex];

    let calculatedPosition: number;

    if (!prevColumn && !nextColumn) {
        calculatedPosition = 1000;
    } else if (!prevColumn) {
        calculatedPosition = Math.floor(nextColumn.position / 2);
    } else if (!nextColumn) {
        calculatedPosition = prevColumn.position + 1000;
    } else {
        calculatedPosition = Math.floor((prevColumn.position + nextColumn.position) / 2);
    }

    const collides =
        (prevColumn && calculatedPosition <= prevColumn.position) ||
        (nextColumn && calculatedPosition >= nextColumn.position);

    if (collides) {
        columns.splice(newIndex, 0, movingColumn);

        const updated = await prisma.$transaction(
            columns.map((col, i) =>
                prisma.column.update({
                    where: { id: col.id },
                    data: { position: (i + 1) * 1000 },
                })
            )
        );

        return { message: "Column reordered successfully (positions renumbered)", data: updated };
    }

    const updatedColumn = await prisma.column.update({
        where: { id: columnId },
        data: { position: calculatedPosition },
    });

    return { message: "Column reordered successfully", data: updatedColumn };
};