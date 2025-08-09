/*
  Warnings:

  - You are about to drop the column `ipAddress` on the `devices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."devices" DROP COLUMN "ipAddress",
ADD COLUMN     "host" TEXT;
