import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';
import { LocalStorageService } from './local-storage.service';

export const STORAGE_SERVICE = 'STORAGE_SERVICE';

export interface StorageProvider {
  getUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<string>;
  getDownloadUrl(key: string, expiresIn?: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
  buildKey(firmId: string, caseId: string, filename: string): string;
}

export const storageProviderFactory = {
  provide: STORAGE_SERVICE,
  useFactory: (config: ConfigService, s3: S3Service, local: LocalStorageService): StorageProvider => {
    const storageType = config.get<string>('STORAGE_TYPE', 'local');
    const accessKeyId = config.get<string>('s3.accessKeyId', 'test');

    // Use local storage unless explicitly configured for S3 with real credentials
    if (storageType === 's3' && accessKeyId !== 'test') {
      return s3;
    }
    return local;
  },
  inject: [ConfigService, S3Service, LocalStorageService],
};
