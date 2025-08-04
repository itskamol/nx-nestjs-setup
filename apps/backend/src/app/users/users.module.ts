import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PasswordService } from '../common/services/password.service';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../common/cache/cache.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PasswordService],
  exports: [UsersService],
})
export class UsersModule {}