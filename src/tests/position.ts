export function calculatePosition(cardToLeft:number | null, cardToRight:number | null):number{
        if (cardToLeft === null && cardToRight===null) {
            return 1000;
        } else if (cardToLeft === null) {
            return Math.floor(
                cardToRight! / 2
            );
        } else if (cardToRight === null) {
            return cardToLeft! + 1000;
        } else {
            return Math.floor(
                (cardToLeft! + cardToRight!) / 2
            );
        }
}