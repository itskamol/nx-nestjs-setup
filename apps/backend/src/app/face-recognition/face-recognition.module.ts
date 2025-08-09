import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database';
import { CacheModule } from '../common';
import { FaceRecognitionService, HikvisionService } from './services';
import { HikvisionIsapiService } from './services/hiki.service';
import { HttpModule } from '@nestjs/axios';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ConfigModule, DatabaseModule, CacheModule, HttpModule, UsersModule],
  controllers: [],
  providers: [FaceRecognitionService, HikvisionService, HikvisionIsapiService],
  exports: [FaceRecognitionService, HikvisionService, HikvisionIsapiService],
})
export class FaceRecognitionModule {}
