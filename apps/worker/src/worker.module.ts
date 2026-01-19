import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OcrConsumer } from './workers/ocr.consumer';
import { OcrModule } from './workers/ocr.module';
import { typeOrmOptionsFromDatabaseUrl } from './database/typeorm.options';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        typeOrmOptionsFromDatabaseUrl(config.get<string>('DATABASE_URL')),
    }),
    OcrModule,
    SearchModule,
  ],
  providers: [OcrConsumer],
})
export class WorkerModule {}
