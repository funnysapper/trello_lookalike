-- AlterTable
ALTER TABLE "workspace_members" ADD COLUMN     "role_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
