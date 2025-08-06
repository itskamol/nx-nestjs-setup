import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { CacheModule } from '../common/cache/cache.module';
import { FaceRecognitionController } from './controllers/face-recognition.controller';
import { FaceRecognitionService } from './services/face-recognition.service';
import { HikvisionService } from './services/hikvision.service';

@Module({
  imports: [ConfigModule, DatabaseModule, CacheModule],
  controllers: [FaceRecognitionController],
  providers: [FaceRecognitionService, HikvisionService],
  exports: [FaceRecognitionService, HikvisionService],
})
export class FaceRecognitionModule {}
