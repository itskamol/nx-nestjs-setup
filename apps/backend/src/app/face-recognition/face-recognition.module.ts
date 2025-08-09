import { Module } from '@nestjs/common';
import { FaceRecognitionController } from './controllers/face-recognition.controller';
import { FaceRecognitionService } from './services/face-recognition.service';
import { HikvisionModule } from '../hikvision/hikvision.module';

@Module({
  imports: [HikvisionModule],
  controllers: [FaceRecognitionController],
  providers: [FaceRecognitionService],
})
export class FaceRecognitionModule {}
