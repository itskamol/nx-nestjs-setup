import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database';
import { CacheModule } from '../common';
import { FaceRecognitionController } from './controllers';
import { FaceRecognitionService, HikvisionService } from './services';
import { HikvisionIsapiService } from './services/hiki.service';
import { HikvisionController } from './controllers/hikvision.controller';
import { HttpModule } from '@nestjs/axios';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ConfigModule, DatabaseModule, CacheModule, HttpModule, UsersModule],
  controllers: [FaceRecognitionController, HikvisionController],
  providers: [FaceRecognitionService, HikvisionService, HikvisionIsapiService],
  exports: [FaceRecognitionService, HikvisionService, HikvisionIsapiService],
})
export class FaceRecognitionModule {}
