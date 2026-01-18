import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { RoleModule } from './roles/role.module';
import { typeOrmOptionsFromDatabaseUrl } from './database/typeorm.options';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        typeOrmOptionsFromDatabaseUrl(config.get<string>('DATABASE_URL')),
    }),
    HealthModule,
    AuthModule,
    RoleModule,
  ],
})
export class AppModule {}

