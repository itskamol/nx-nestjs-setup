import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FaceRecognitionWebSocketGateway } from './face-recognition.gateway';
import { WebSocketEventService } from './websocket-event.service';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../../users/users.module';
import { FaceRecognitionModule } from '../../face-recognition/face-recognition.module';
import { DatabaseModule } from '../../database/database.module';
import { AppConfigService, ConfigModule } from '@backend/app/config';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: AppConfigService) => ({
        secret: configService.jwt.secret,
        signOptions: {
          expiresIn: configService.jwt.expiresIn,
        },
      }),
      inject: [AppConfigService],
    }),
    UsersModule,
    FaceRecognitionModule,
    DatabaseModule,
  ],
  providers: [FaceRecognitionWebSocketGateway, WebSocketEventService],
  exports: [FaceRecognitionWebSocketGateway, WebSocketEventService],
})
export class WebSocketModule {}
