import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import configuration from './configuration';
import { validateConfig } from './config.validation';
import { AppConfigService } from './config.service';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateConfig,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      expandVariables: true,
      cache: true,
    }),
  ],
  providers: [AppConfigService],
  exports: [NestConfigModule, AppConfigService],
})
export class ConfigModule {}
