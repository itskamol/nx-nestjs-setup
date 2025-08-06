-- CreateEnum
CREATE TYPE "public"."FaceRecognitionEventType" AS ENUM ('DETECTED', 'RECOGNIZED', 'UNKNOWN', 'ENROLLED', 'UPDATED', 'DELETED');

-- CreateTable
CREATE TABLE "public"."face_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "faceId" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "faceData" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "face_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."face_recognition_events" (
    "id" TEXT NOT NULL,
    "faceRecordId" TEXT,
    "faceId" TEXT,
    "eventType" "public"."FaceRecognitionEventType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cameraId" TEXT,
    "location" TEXT,
    "imageData" TEXT,
    "metadata" JSONB,

    CONSTRAINT "face_recognition_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "face_records_faceId_key" ON "public"."face_records"("faceId");

-- CreateIndex
CREATE INDEX "face_records_userId_idx" ON "public"."face_records"("userId");

-- CreateIndex
CREATE INDEX "face_records_faceId_idx" ON "public"."face_records"("faceId");

-- CreateIndex
CREATE INDEX "face_records_isActive_idx" ON "public"."face_records"("isActive");

-- CreateIndex
CREATE INDEX "face_recognition_events_faceRecordId_idx" ON "public"."face_recognition_events"("faceRecordId");

-- CreateIndex
CREATE INDEX "face_recognition_events_faceId_idx" ON "public"."face_recognition_events"("faceId");

-- CreateIndex
CREATE INDEX "face_recognition_events_eventType_idx" ON "public"."face_recognition_events"("eventType");

-- CreateIndex
CREATE INDEX "face_recognition_events_timestamp_idx" ON "public"."face_recognition_events"("timestamp");

-- AddForeignKey
ALTER TABLE "public"."face_records" ADD CONSTRAINT "face_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."face_recognition_events" ADD CONSTRAINT "face_recognition_events_faceRecordId_fkey" FOREIGN KEY ("faceRecordId") REFERENCES "public"."face_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
