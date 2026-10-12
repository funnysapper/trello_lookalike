-- AlterTable
ALTER TABLE "board_columns_cards" ALTER COLUMN "position" DROP DEFAULT;
DROP SEQUENCE "board_columns_cards_position_seq";
