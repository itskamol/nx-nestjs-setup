import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AppConfigService } from '../config/config.service';

@Global()
@Module({
  providers: [PrismaService, AppConfigService],
  exports: [PrismaService],
})
export class DatabaseModule {}