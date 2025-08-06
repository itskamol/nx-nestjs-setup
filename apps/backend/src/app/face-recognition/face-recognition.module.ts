import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database';
import { CacheModule } from '../common';
import { FaceRecognitionController } from './controllers';
import { FaceRecognitionService, HikvisionService } from './services';

@Module({
  imports: [ConfigModule, DatabaseModule, CacheModule],
  controllers: [FaceRecognitionController],
  providers: [FaceRecognitionService, HikvisionService],
  exports: [FaceRecognitionService, HikvisionService],
})
export class FaceRecognitionModule {}
