import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Local file storage for development. Drop-in replacement for S3Service
 * when STORAGE_TYPE=local (or when S3 credentials are dummy values).
 *
 * Files are stored under `<project-root>/uploads/`.
 */
@Injectable()
export class LocalStorageService {
  private readonly uploadDir: string;
  private readonly apiUrl: string;
  private readonly logger = new Logger(LocalStorageService.name);

  constructor(private readonly config: ConfigService) {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
    const port = config.get<number>('app.port', 3000);
    const prefix = config.get<string>('app.apiPrefix', 'api');
    this.apiUrl = `http://localhost:${port}/${prefix}`;

    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Returns a URL that the frontend can PUT a file to.
   * The StorageController handles the actual save.
   */
  async getUploadUrl(key: string, _contentType: string, _expiresIn = 3600): Promise<string> {
    return `${this.apiUrl}/storage/upload/${encodeURIComponent(key)}`;
  }

  /**
   * Returns a URL that serves the file for download.
   */
  async getDownloadUrl(key: string, _expiresIn = 3600): Promise<string> {
    return `${this.apiUrl}/storage/files/${encodeURIComponent(key)}`;
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = this.resolveFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log(`Deleted local file: ${key}`);
    }
  }

  buildKey(firmId: string, caseId: string, filename: string): string {
    return `${firmId}/${caseId}/${Date.now()}-${filename}`;
  }

  /** Save raw file buffer to local disk. */
  saveFile(key: string, data: Buffer): void {
    const filePath = this.resolveFilePath(key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, data);
    this.logger.log(`Saved local file: ${key} (${data.length} bytes)`);
  }

  /** Read file from local disk. */
  readFile(key: string): Buffer | null {
    const filePath = this.resolveFilePath(key);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  }

  fileExists(key: string): boolean {
    return fs.existsSync(this.resolveFilePath(key));
  }

  private resolveFilePath(key: string): string {
    // Sanitize: prevent directory traversal
    const sanitized = key.replace(/\.\./g, '');
    return path.join(this.uploadDir, sanitized);
  }
}
