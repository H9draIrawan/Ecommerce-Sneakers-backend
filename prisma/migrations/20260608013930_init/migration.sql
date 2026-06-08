-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT[] DEFAULT ARRAY['user']::TEXT[];
