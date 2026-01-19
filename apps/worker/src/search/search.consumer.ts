import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, logLevel } from 'kafkajs';
import { SearchIndexerService } from './search-indexer.service';

type SearchMessage = {
  versionId: string;
};

@Injectable()
export class SearchConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer: any;
  private producer: any;

  constructor(
    private readonly config: ConfigService,
    private readonly indexer: SearchIndexerService,
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
      groupId: this.config.get<string>('KAFKA_GROUP_ID_SEARCH') || 'paperforge-search-indexer',
    });
    this.producer = kafka.producer();

    const topic = this.config.get<string>('KAFKA_TOPIC_SEARCH_INDEX') || 'paperforge.search.index';
    await this.consumer.connect();
    await this.producer.connect();
    await this.consumer.subscribe({ topic, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }: any) => {
        if (!message?.value) return;
        const raw = message.value.toString('utf8');
        let payload: SearchMessage;
        try {
          payload = JSON.parse(raw);
        } catch {
          return;
        }

        const versionId = payload?.versionId;
        if (!versionId) return;

        try {
          await this.indexer.indexVersion(versionId);
        } catch (error: any) {
          const errMsg = error?.message ? String(error.message) : 'Search indexing failed';
          await this.producer.send({
            topic: this.config.get<string>('KAFKA_TOPIC_SEARCH_DLQ') || 'paperforge.search.dlq',
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

