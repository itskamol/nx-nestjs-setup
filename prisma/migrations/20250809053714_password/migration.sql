/*
  Warnings:

  - You are about to drop the column `apiKeyHash` on the `devices` table. All the data in the column will be lost.
  - Added the required column `password` to the `devices` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."devices" DROP COLUMN "apiKeyHash",
ADD COLUMN     "password" TEXT NOT NULL;
