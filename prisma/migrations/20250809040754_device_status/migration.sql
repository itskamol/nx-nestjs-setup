/*
  Warnings:

  - The `status` column on the `devices` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."DeviceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OFFLINE');

-- AlterTable
ALTER TABLE "public"."devices" DROP COLUMN "status",
ADD COLUMN     "status" "public"."DeviceStatus" NOT NULL DEFAULT 'ACTIVE';
