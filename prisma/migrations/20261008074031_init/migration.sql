-- AlterTable
ALTER TABLE "board_columns" ALTER COLUMN "position" DROP DEFAULT;
DROP SEQUENCE "board_columns_position_seq";

-- AlterTable
CREATE SEQUENCE board_columns_cards_position_seq;
ALTER TABLE "board_columns_cards" ALTER COLUMN "position" SET DEFAULT nextval('board_columns_cards_position_seq');
ALTER SEQUENCE board_columns_cards_position_seq OWNED BY "board_columns_cards"."position";
