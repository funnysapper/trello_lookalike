import prisma from '../config/prisma.ts';
import {AppError} from '../middleware/error.ts';
import redis from '../config/redis.ts';


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

export const changePosInCol = async(cardId:number, columnId:number, newPos:number, workspaceId:number)=>{
    const card = await prisma.card.findFirst({
        where:{id:cardId,column:{board:{workspaceId}}}
    })
    if(!card) throw new AppError(404,"This card does not exist or does not belong to this column");

    const pos = await prisma.card.findMany({
        where:{columnId:columnId,board:{workspaceId}},
        orderBy:{position:'asc'}
    })

    const movingCardIndex = pos.findIndex(c=>c.id===cardId);

    if(movingCardIndex === -1) throw new AppError(404,"Card not found in this column");
    const [movingCard] = pos.splice(movingCardIndex,1);
    const cardToLeft = pos[newPos -1];
    const cardToRight = pos[newPos];

    let calculatedPosition:number;
    if(!cardToLeft && !cardToRight){
       calculatedPosition = 1000;
    }else if(!cardToLeft){
       calculatedPosition = Math.floor(cardToRight.position/2)
    }else if(!cardToRight){
       calculatedPosition = cardToLeft.position + 1000;
    } else {
        calculatedPosition = Math.floor((cardToLeft.position + cardToRight.position) / 2);
    }
    const collides =
        (cardToLeft && calculatedPosition <= cardToLeft.position) ||
        (cardToRight && calculatedPosition >= cardToRight.position);

    if (collides) {
        pos.splice(newPos, 0, movingCard);

        const updated = await prisma.$transaction(
            pos.map((col, i) =>
                prisma.card.update({
                    where: { id: col.id },
                    data: { position: (i + 1) * 1000 },
                })
            )
        );
        return { message: "Card reordered successfully (positions renumbered)", data: updated };
    }

    const updatedCard = await prisma.card.update({
        where: { id: cardId },
        data: { position: calculatedPosition },
    });

    return { message: "Card reordered successfully", data: updatedCard };
}

export const changeCardCol = async (cardId: number, newColId: number, workspaceId: number, posIndex: number) => {
    const card = await prisma.card.findFirst({
        where: {
            id: cardId,
            column: { board: { workspaceId } },
        },
        include: {
            column: {
                select: { boardId: true }
            }
        }
    });

    if (!card) {
        throw new AppError(404, "This card does not exist or does not belong to this workspace.");
    }

    const oldBoardId = card.column.boardId;

    if (card.columnId === newColId) {
        throw new AppError(409, "The card is already in this column. Use the reorder endpoint instead.");
    }
    const targetColumn = await prisma.column.findFirst({
        where: {
            id: newColId,
            board: { workspaceId },
        },
        select: { id: true, boardId: true },
    });

    if (!targetColumn) {
        throw new AppError(404, "The target column does not exist or does not belong to this workspace.");
    }

    const newBoardId = targetColumn.boardId;

    const cards = await prisma.card.findMany({
        where: { columnId: newColId },
        orderBy: { position: 'asc' },
    });

    const cardToLeft = cards[posIndex - 1];
    const cardToRight = cards[posIndex];

    let calculatedPosition: number;

    if (!cardToLeft && !cardToRight) {
        calculatedPosition = 1000;
    } else if (!cardToLeft) {
        calculatedPosition = Math.floor(cardToRight.position / 2);
    } else if (!cardToRight) {
        calculatedPosition = cardToLeft.position + 1000;
    } else {
        calculatedPosition = Math.floor((cardToLeft.position + cardToRight.position) / 2);
    }

    const collides =
        (cardToLeft && calculatedPosition <= cardToLeft.position) ||
        (cardToRight && calculatedPosition >= cardToRight.position);

    let result;

    if (collides) {
        cards.splice(posIndex, 0, card);

        const updated = await prisma.$transaction([
            prisma.card.update({
                where: { id: card.id },
                data: { columnId: newColId },
            }),
            ...cards.map((c, i) =>
                prisma.card.update({
                    where: { id: c.id },
                    data: { position: (i + 1) * 1000 },
                })
            ),
        ]);

        result = { message: "Card moved (positions renumbered)", data: updated };
    } else {
        const moved = await prisma.card.update({
            where: { id: card.id },
            data: { columnId: newColId, position: calculatedPosition },
        });

        result = { message: "Card moved to the new column successfully", data: moved };
    }

    try{
    await redis.del(`board:${oldBoardId}`);
    }catch(error){
      console.error('Cache invalidation failed')
    }
    if (newBoardId !== oldBoardId) {
        await redis.del(`board:${newBoardId}`);
    }
    return result;
};