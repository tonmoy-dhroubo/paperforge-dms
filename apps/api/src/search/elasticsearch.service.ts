import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElasticsearchService {
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (this.config.get<string>('ELASTICSEARCH_URL') || 'http://localhost:9200').replace(/\/+$/, '');
  }

  async head(path: string) {
    const res = await fetch(this.url(path), { method: 'HEAD' });
    return { ok: res.ok, status: res.status };
  }

  async postJson<T = any>(path: string, body: unknown): Promise<T> {
    const res = await fetch(this.url(path), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Elasticsearch POST ${path} failed: ${res.status} ${text}`);
    return text ? (JSON.parse(text) as T) : ({} as T);
  }

  private url(path: string) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalized}`;
  }
}

