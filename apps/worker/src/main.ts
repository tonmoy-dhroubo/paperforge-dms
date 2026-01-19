import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(WorkerModule, { logger: ['log', 'warn', 'error'] });
  // eslint-disable-next-line no-console
  console.log('Worker started');
}

bootstrap();

