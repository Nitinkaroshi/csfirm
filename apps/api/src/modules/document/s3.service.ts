import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(S3Service.name);

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      region: config.get<string>('s3.region')!,
      endpoint: config.get<string>('s3.endpoint') || undefined,
      forcePathStyle: !!config.get<string>('s3.endpoint'), // For MinIO compatibility
      credentials: {
        accessKeyId: config.get<string>('s3.accessKeyId')!,
        secretAccessKey: config.get<string>('s3.secretAccessKey')!,
      },
    });
    this.bucket = config.get<string>('s3.bucket')!;
  }

  async getUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.s3.send(command);
    this.logger.log(`Deleted S3 object: ${key}`);
  }

  buildKey(firmId: string, caseId: string, filename: string): string {
    return `${firmId}/${caseId}/${Date.now()}-${filename}`;
  }
}
