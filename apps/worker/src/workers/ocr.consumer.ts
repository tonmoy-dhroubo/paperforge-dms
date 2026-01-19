import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, logLevel } from 'kafkajs';
import { OcrService } from './ocr.service';

type OcrMessage = {
  versionId: string;
  documentId?: string;
  folderId?: string;
};

@Injectable()
export class OcrConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer: any;
  private producer: any;

  constructor(
    private readonly config: ConfigService,
    private readonly ocr: OcrService,
  ) {}

  async onModuleInit() {
    const brokers = (this.config.get<string>('KAFKA_BROKERS') || 'localhost:9094')
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);

    const kafka = new Kafka({
      clientId: this.config.get<string>('KAFKA_CLIENT_ID') || 'paperforge-worker',
      brokers,
      logLevel: logLevel.ERROR,
    });

    this.consumer = kafka.consumer({
      groupId: this.config.get<string>('KAFKA_GROUP_ID_OCR') || 'paperforge-ocr-worker',
    });
    this.producer = kafka.producer();

    const topic = this.config.get<string>('KAFKA_TOPIC_VERSION_CREATED') || 'paperforge.document-version.created';
    await this.consumer.connect();
    await this.producer.connect();
    await this.consumer.subscribe({ topic, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }: any) => {
        if (!message?.value) return;
        const raw = message.value.toString('utf8');
        let payload: OcrMessage;
        try {
          payload = JSON.parse(raw);
        } catch {
          return;
        }

        const versionId = payload?.versionId;
        if (!versionId) return;

        try {
          await this.ocr.processVersion(versionId);
          await this.producer.send({
            topic: this.config.get<string>('KAFKA_TOPIC_OCR_COMPLETED') || 'paperforge.ocr.completed',
            messages: [{ value: JSON.stringify({ versionId }) }],
          });
        } catch (error: any) {
          const errMsg = error?.message ? String(error.message) : 'OCR failed';
          await this.producer.send({
            topic: this.config.get<string>('KAFKA_TOPIC_OCR_DLQ') || 'paperforge.ocr.dlq',
            messages: [{ value: JSON.stringify({ versionId, error: errMsg }) }],
          });
        }
      },
    });
  }

  async onModuleDestroy() {
    await this.consumer?.disconnect().catch(() => null);
    await this.producer?.disconnect().catch(() => null);
  }
}

