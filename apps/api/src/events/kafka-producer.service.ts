import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, logLevel, Producer } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private producer: Producer | null = null;
  private connecting: Promise<void> | null = null;

  constructor(private readonly config: ConfigService) {}

  private isEnabled() {
    const raw = this.config.get<string>('KAFKA_ENABLED');
    if (!raw) return true;
    return raw.toLowerCase() !== 'false';
  }

  private brokers() {
    const brokersString =
      this.config.get<string>('KAFKA_BROKERS') ||
      `localhost:${this.config.get<string>('KAFKA_BROKER_HOST_PORT') || '9094'}`;

    return brokersString
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);
  }

  private async ensureConnected() {
    if (!this.isEnabled()) return;
    if (this.producer) return;
    if (this.connecting) return this.connecting;

    const kafka = new Kafka({
      clientId: this.config.get<string>('KAFKA_CLIENT_ID') || 'paperforge-api',
      brokers: this.brokers(),
      logLevel: logLevel.ERROR,
    });

    const producer = kafka.producer();
    this.producer = producer;
    this.connecting = producer
      .connect()
      .catch((err) => {
        this.producer = null;
        const msg = err?.message ? String(err.message) : String(err);
        this.logger.error(`Kafka connect failed: ${msg}`);
        throw err;
      })
      .finally(() => {
        this.connecting = null;
      });

    return this.connecting;
  }

  async publish(topic: string, payload: unknown) {
    if (!this.isEnabled()) return { published: false as const, reason: 'disabled' as const };
    await this.ensureConnected();
    if (!this.producer) throw new Error('Kafka producer not connected');

    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }],
    });
    return { published: true as const };
  }

  async onModuleDestroy() {
    await this.producer?.disconnect().catch(() => null);
  }
}

