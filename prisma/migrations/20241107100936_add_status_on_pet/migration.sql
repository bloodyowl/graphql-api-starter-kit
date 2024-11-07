-- CreateEnum
CREATE TYPE "PetStatus" AS ENUM ('Active', 'Suspended');

-- AlterTable
ALTER TABLE "Pet" ADD COLUMN     "status" "PetStatus" NOT NULL DEFAULT 'Active',
ADD COLUMN     "suspensionReason" TEXT;
