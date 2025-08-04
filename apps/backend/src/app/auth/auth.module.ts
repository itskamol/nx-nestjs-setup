import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtService } from './jwt.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { PasswordService } from '../common/services/password.service';
import { CacheService } from '../common/cache/cache.service';
import { AppConfigService } from '../config/config.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env['JWT_SECRET'] || 'default-jwt-secret',
      signOptions: {
        expiresIn: process.env['JWT_EXPIRES_IN'] || '15m',
      },
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtService,
    JwtStrategy,
    PasswordService,
  ],
  exports: [AuthService, JwtService],
})
export class AuthModule {}