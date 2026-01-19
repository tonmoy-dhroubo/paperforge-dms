import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT') || 'http://localhost:9000';
    const region = this.config.get<string>('S3_REGION') || 'us-east-1';
    const accessKeyId = this.config.get<string>('S3_ACCESS_KEY') || 'minioadmin';
    const secretAccessKey = this.config.get<string>('S3_SECRET_KEY') || 'minioadmin123';
    const forcePathStyle = (this.config.get<string>('S3_FORCE_PATH_STYLE') || 'true').toLowerCase() === 'true';

    this.bucket = this.config.get<string>('S3_BUCKET') || 'paperforge';

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  bucketName() {
    return this.bucket;
  }

  async headObject(key: string) {
    const res = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    return {
      contentType: res.ContentType || null,
      contentLength: typeof res.ContentLength === 'number' ? res.ContentLength : null,
    };
  }

  async getObjectStream(key: string) {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!res.Body) throw new Error('Missing object body');
    return res.Body as any;
  }
}

