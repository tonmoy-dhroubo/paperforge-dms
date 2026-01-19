import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, HeadObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly presignClient: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT') || 'http://localhost:9000';
    const presignEndpoint = this.config.get<string>('S3_PRESIGN_ENDPOINT') || endpoint;
    const region = this.config.get<string>('S3_REGION') || 'us-east-1';
    const accessKeyId = this.config.get<string>('S3_ACCESS_KEY') || 'minioadmin';
    const secretAccessKey = this.config.get<string>('S3_SECRET_KEY') || 'minioadmin123';
    const forcePathStyle = (this.config.get<string>('S3_FORCE_PATH_STYLE') || 'true').toLowerCase() === 'true';

    this.bucket = this.config.get<string>('S3_BUCKET') || 'paperforge';

    const baseConfig = {
      region,
      forcePathStyle,
      credentials: { accessKeyId, secretAccessKey },
    } as const;

    this.client = new S3Client({ ...baseConfig, endpoint });
    this.presignClient = new S3Client({ ...baseConfig, endpoint: presignEndpoint });
  }

  getBucket() {
    return this.bucket;
  }

  async presignUpload(key: string, contentType: string, expiresInSeconds = 900) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(this.presignClient, command, { expiresIn: expiresInSeconds });
    return { url, bucket: this.bucket, key, expiresInSeconds, requiredHeaders: { 'Content-Type': contentType } };
  }

  async presignDownload(key: string, expiresInSeconds = 900) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const url = await getSignedUrl(this.presignClient, command, { expiresIn: expiresInSeconds });
    return { url, bucket: this.bucket, key, expiresInSeconds };
  }

  async headObject(key: string) {
    const res = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    return {
      contentType: res.ContentType || null,
      contentLength: typeof res.ContentLength === 'number' ? res.ContentLength : null,
      etag: res.ETag || null,
    };
  }
}
