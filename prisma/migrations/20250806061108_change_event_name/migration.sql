/*
  Warnings:

  - Changed the type of `eventType` on the `face_recognition_events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."FaceEventType" AS ENUM ('DETECTED', 'RECOGNIZED', 'UNKNOWN', 'ENROLLED', 'UPDATED', 'DELETED');

-- AlterTable
ALTER TABLE "public"."face_recognition_events" DROP COLUMN "eventType",
ADD COLUMN     "eventType" "public"."FaceEventType" NOT NULL;

-- DropEnum
DROP TYPE "public"."FaceRecognitionEventType";

-- CreateIndex
CREATE INDEX "face_recognition_events_eventType_idx" ON "public"."face_recognition_events"("eventType");
