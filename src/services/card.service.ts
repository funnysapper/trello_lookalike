import prisma from '../config/prisma.ts';
import {AppError} from '../middleware/error.ts';
import redis from '../config/redis.ts';
import { emitToBoard } from '../middleware/socket.ts';


export const createCard = async(title:string, userId:number , columnId:number, workspaceId:number, description?:string)=>{
    const existingColumn = await prisma.column.findFirst({
        where:{
            id:columnId,
            board:{workspaceId}
        },
        select:{id:true}
    })
    if(!existingColumn){
      throw new AppError(404,"This column does not exist")
    }
    const newCard = await prisma.card.create({
        data:{
            title:title,
            description:description,
            columnId:columnId,
            createdBy:userId,
            position:0
        }
    })
    const updatedCard = await prisma.card.update({
        where:{id:newCard.id},
        data:{position:newCard.id * 1000}
    })
    return updatedCard;
}

export const deleteCard = async (cardId: number, workspaceId: number) => {
    const card = await prisma.card.findFirst({
        where: { 
            id: cardId, 
            column: { board: { workspaceId } } 
        },
        select: {
            column: {
                select: { boardId: true }
            }
        }
    });
    if (!card) {
        throw new AppError(404, "This card does not exist or does not belong to this workspace");
    }

    await prisma.card.delete({
        where: { id: cardId }
    });
    const boardId = card.column.boardId;
    await redis.del(`board:${boardId}`);

    return { message: "Card has been deleted successfully" };
}

export const editCard = async(cardId:number, workspaceId:number, title:string, description?:string)=>{
   const card = await prisma.card.findFirst({
    where:{id:cardId,column:{board:{workspaceId}}}
   })
   if(!card){
    throw new AppError(404,"This card does not exist or does not belong to this column")
   }
   const editedCard = await prisma.card.update({
    where:{id:card.id},
    data:{
        title:title,
        description:description
    },
    include:{column:{select:{boardId:true}}}
   })
   const boardId = editedCard.column.boardId;
   await redis.del(`board:${boardId}`);
   return editedCard;
}

export const changePosInCol = async (cardId: number,columnId: number,newPos: number,workspaceId: number) => 
{
    const result = await prisma.$transaction(async (tx) => {

        // 1. Find the card and verify that it belongs to this column
        // and workspace.
        const card = await tx.card.findFirst({
            where: {
                id: cardId,
                columnId,
                column: {
                    board: { workspaceId },
                },
            },
            include: {
                column: {
                    select: { boardId: true },
                },
            },
        });

        if (!card) {
            throw new AppError(
                404,
                "This card does not exist or does not belong to this column."
            );
        }

        // 2. Fetch all cards in the column.
        const pos = await tx.card.findMany({
            where: {
                columnId,
            },
            orderBy: {
                position: 'asc',
            },
        });

        // 3. Find the moving card's current index.
        const movingCardIndex = pos.findIndex(
            c => c.id === cardId
        );

        if (movingCardIndex === -1) {
            throw new AppError(404, "Card not found in this column.");
        }

        // 4. Remove the moving card from the array.
        const [movingCard] = pos.splice(movingCardIndex, 1);

        // 5. Validate the requested position.
        if (
            !Number.isInteger(newPos) ||
            newPos < 1 ||
            newPos > pos.length + 1
        ) {
            throw new AppError(400, "Invalid card position.");
        }

        // 6. Calculate the insertion index.
        const insertionIndex = Math.min(newPos - 1,pos.length);

        // 7. Find the neighbouring cards.
        const cardToLeft = pos[insertionIndex - 1];
        const cardToRight = pos[insertionIndex];

        let calculatedPosition: number;

        // 8. Calculate the moving card's new position.
        if (!cardToLeft && !cardToRight) {
            calculatedPosition = 1000;
        } else if (!cardToLeft) {
            calculatedPosition = Math.floor(
                cardToRight.position / 2
            );
        } else if (!cardToRight) {
            calculatedPosition = cardToLeft.position + 1000;
        } else {
            calculatedPosition = Math.floor(
                (cardToLeft.position + cardToRight.position) / 2
            );
        }

        // 9. Check whether the calculated position collides
        // with either neighbouring card.
        const collides =
            (cardToLeft &&
                calculatedPosition <= cardToLeft.position) ||
            (cardToRight &&
                calculatedPosition >= cardToRight.position);

        let updatedCard;

        if (collides) {

            // 10. Build the intended final order.
            const finalOrder = [...pos];

            finalOrder.splice(insertionIndex, 0, movingCard);

            // Move all existing positions temporarily to avoid
            // conflicts if (columnId, position) has a unique constraint.
            const maxPosition = Math.max(
                ...finalOrder.map(c => c.position)
            );

            const temporaryBase =
                maxPosition + (finalOrder.length + 1) * 1000;

            for (let i = 0; i < finalOrder.length; i++) {
                await tx.card.update({
                    where: { id: finalOrder[i].id },
                    data: {
                        position: temporaryBase + (i + 1) * 1000,
                    },
                });
            }

            // 11. Assign the final positions.
            for (let i = 0; i < finalOrder.length; i++) {
                await tx.card.update({
                    where: { id: finalOrder[i].id },
                    data: {
                        position: (i + 1) * 1000,
                    },
                });
            }

        } else {

            // 12. If there is enough space, update only the moving card.
            updatedCard = await tx.card.update({
                where: { id: cardId },
                data: {
                    position: calculatedPosition,
                },
            });
        }

        // 13. Fetch the final reordered column.
        const reorderedColumn = await tx.card.findMany({
            where: { columnId },
            orderBy: { position: 'asc' },
        });

        if (collides) {
            updatedCard = reorderedColumn.find(c => c.id === cardId);
        }

        return {
            boardId: card.column.boardId,
            updatedCard,
            cards: reorderedColumn,
        };
    });

    // 14. Invalidate the board cache.
    try {
        await redis.del(`board:${result.boardId}`);
    } catch (error) {
        console.error('Cache invalidation failed:', error);
    }

    // 15. Notify connected clients.
    emitToBoard(result.boardId, 'card:moved', {
        cardId: result.updatedCard!.id,
        fromColumnId: columnId,
        toColumnId: columnId,
        position: result.updatedCard!.position,
        cards: result.cards,
    });

    return {
        message: "Card reordered successfully",
        data: result.cards,
    };
};

export const changeCardCol = async (
    cardId: number,
    newColId: number,
    workspaceId: number,
    newPos: number
) => {

    const result = await prisma.$transaction(async (tx) => {

        // 1. Find the card and verify workspace ownership.
        const card = await tx.card.findFirst({
            where: {
                id: cardId,
                column: {
                    board: { workspaceId },
                },
            },
            include: {
                column: {
                    select: { boardId: true },
                },
            },
        });

        if (!card) {
            throw new AppError(
                404,
                "This card does not exist or does not belong to this workspace."
            );
        }

        const oldBoardId = card.column.boardId;
        const oldColumnId = card.columnId;

        // 2. Prevent using this function to reorder within the same column.
        if (card.columnId === newColId) {
            throw new AppError(
                409,
                "The card is already in this column. Use the reorder endpoint instead."
            );
        }

        // 3. Verify that the destination column belongs to the workspace.
        const targetColumn = await tx.column.findFirst({
            where: {
                id: newColId,
                board: { workspaceId },
            },
            select: {
                id: true,
                boardId: true,
            },
        });

        if (!targetColumn) {
            throw new AppError(
                404,
                "The target column does not exist or does not belong to this workspace."
            );
        }

        const newBoardId = targetColumn.boardId;

        // 4. Fetch cards in the destination column.
        const pos = await tx.card.findMany({
            where: {
                columnId: targetColumn.id,
            },
            orderBy: {
                position: 'asc',
            },
        });

        // 5. Validate the requested position.
        if (
            !Number.isInteger(newPos) ||
            newPos < 1
        ) {
            throw new AppError(400, "Invalid card position.");
        }

        // 6. Determine the insertion index.
        const insertionIndex = Math.min(newPos-1, pos.length);

        // 7. Find the neighbouring cards.
        const cardToLeft = pos[insertionIndex - 1];
        const cardToRight = pos[insertionIndex];

        let calculatedPosition: number;

        // 8. Calculate the moving card's new position.
        if (!cardToLeft && !cardToRight) {
            calculatedPosition = 1000;
        } else if (!cardToLeft) {
            calculatedPosition = Math.floor(
                cardToRight.position / 2
            );
        } else if (!cardToRight) {
            calculatedPosition = cardToLeft.position + 1000;
        } else {
            calculatedPosition = Math.floor(
                (cardToLeft.position + cardToRight.position) / 2
            );
        }

        // 9. Check whether the calculated position collides.
        const collides =
            calculatedPosition < 1 ||
            (cardToLeft &&
                calculatedPosition <= cardToLeft.position) ||
            (cardToRight &&
                calculatedPosition >= cardToRight.position);

        let finalPosition = calculatedPosition;

        if (collides) {

            // 10. Build the intended final order.
            const finalOrder = [...pos];

            finalOrder.splice(insertionIndex, 0, card);

            // 11. Temporarily move cards to unused positions.
            // This also helps avoid composite unique constraint conflicts.
            const maxPosition = Math.max(
                0,
                ...pos.map(c => c.position)
            );

            const temporaryBase =
                maxPosition + (finalOrder.length + 1) * 1000;

            for (let i = 0; i < finalOrder.length; i++) {
                await tx.card.update({
                    where: {
                        id: finalOrder[i].id,
                    },
                    data: {
                        columnId: targetColumn.id,
                        position: temporaryBase + (i + 1) * 1000,
                    },
                });
            }

            // 12. Assign the final positions.
            for (let i = 0; i < finalOrder.length; i++) {
                const updated = await tx.card.update({
                    where: {
                        id: finalOrder[i].id,
                    },
                    data: {
                        position: (i + 1) * 1000,
                    },
                });

                if (updated.id === cardId) {
                    finalPosition = updated.position;
                }
            }

        } else {

            // 13. Enough space exists, so only update the moving card.
            await tx.card.update({
                where: {
                    id: cardId,
                },
                data: {
                    columnId: targetColumn.id,
                    position: calculatedPosition,
                },
            });
        }

        // 14. Fetch both columns after the move.
        const sourceCards = await tx.card.findMany({
            where: {
                columnId: oldColumnId,
            },
            orderBy: {
                position: 'asc',
            },
        });

        const destinationCards = await tx.card.findMany({
            where: {
                columnId: targetColumn.id,
            },
            orderBy: {
                position: 'asc',
            },
        });

        return {
            oldBoardId,
            newBoardId,
            oldColumnId,
            newColumnId: targetColumn.id,
            finalPosition,
            sourceCards,
            destinationCards,
        };
    });

    // 15. Invalidate affected board caches.
    const affectedBoards = new Set([
        result.oldBoardId,
        result.newBoardId,
    ]);

    for (const boardId of affectedBoards) {
        try {
            await redis.del(`board:${boardId}`);
        } catch (error) {
            console.error(
                `Cache invalidation failed for board ${boardId}:`,
                error
            );
        }
    }

    // 16. Notify the relevant board clients.
    if (result.oldBoardId !== result.newBoardId) {

        emitToBoard(result.oldBoardId, 'card:removed', {
            cardId,
            fromColumnId: result.oldColumnId,
            cards: result.sourceCards,
        });

        emitToBoard(result.newBoardId, 'card:moved', {
            cardId,
            fromColumnId: result.oldColumnId,
            toColumnId: result.newColumnId,
            position: result.finalPosition,
            cards: result.destinationCards,
        });

    } else {

        emitToBoard(result.newBoardId, 'card:moved', {
            cardId,
            fromColumnId: result.oldColumnId,
            toColumnId: result.newColumnId,
            position: result.finalPosition,
            sourceCards: result.sourceCards,
            destinationCards: result.destinationCards,
        });
    }

    return {
        message: "Card moved to the new column successfully",
        data: result.destinationCards,
    };
};