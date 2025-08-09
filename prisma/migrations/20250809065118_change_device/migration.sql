/*
  Warnings:

  - You are about to drop the column `deviceId` on the `devices` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[serialNumber]` on the table `devices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `deviceID` to the `devices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deviceName` to the `devices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deviceType` to the `devices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `macAddress` to the `devices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `model` to the `devices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serialNumber` to the `devices` table without a default value. This is not possible if the table is not empty.
  - Made the column `firmwareVersion` on table `devices` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."devices_deviceId_key";

-- AlterTable
ALTER TABLE "public"."devices" DROP COLUMN "deviceId",
ADD COLUMN     "deviceID" TEXT NOT NULL,
ADD COLUMN     "deviceName" TEXT NOT NULL,
ADD COLUMN     "deviceType" TEXT NOT NULL,
ADD COLUMN     "macAddress" TEXT NOT NULL,
ADD COLUMN     "model" TEXT NOT NULL,
ADD COLUMN     "serialNumber" TEXT NOT NULL,
ALTER COLUMN "firmwareVersion" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "devices_serialNumber_key" ON "public"."devices"("serialNumber");
