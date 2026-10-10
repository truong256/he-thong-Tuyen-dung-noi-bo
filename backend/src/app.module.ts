import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import appConfig from './config/app.config';
import { buildPostgresOptions } from './database/typeorm.options';
import { HealthController } from './health.controller';
import { JobTitlesModule } from './job-titles/job-titles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    TypeOrmModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) => buildPostgresOptions(config.db),
    }),
    AuthModule,
    JobTitlesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
