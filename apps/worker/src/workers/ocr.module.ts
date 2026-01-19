import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OcrPage } from './ocr.page.entity';
import { OcrRunner } from './ocr.runner';
import { OcrService } from './ocr.service';
import { StorageModule } from '../storage/storage.module';
import { DocumentVersion } from '../entities/document-version.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentVersion, OcrPage]), StorageModule],
  providers: [OcrRunner, OcrService],
  exports: [OcrService],
})
export class OcrModule {}
