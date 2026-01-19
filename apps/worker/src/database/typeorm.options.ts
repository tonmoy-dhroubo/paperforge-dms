import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DocumentVersion } from '../entities/document-version.entity';
import { OcrPage } from '../workers/ocr.page.entity';

const DEFAULT_DATABASE_URL =
  'postgresql://paperforge:paperforgepass@localhost:5433/paperforge?sslmode=disable';

export function typeOrmOptionsFromDatabaseUrl(databaseUrl?: string): TypeOrmModuleOptions {
  const urlString = databaseUrl || process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  const url = new URL(urlString);

  const sslmode = (url.searchParams.get('sslmode') || 'disable').toLowerCase();
  const sslEnabled = ['require', 'verify-ca', 'verify-full'].includes(sslmode);

  return {
    type: 'postgres',
    host: url.hostname,
    port: Number(url.port || 5432),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    entities: [DocumentVersion, OcrPage],
    synchronize: false,
    logging: false,
  };
}

