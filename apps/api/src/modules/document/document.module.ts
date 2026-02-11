import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { S3Service } from './s3.service';
import { LocalStorageService } from './local-storage.service';
import { StorageController } from './storage.controller';
import { storageProviderFactory } from './storage.provider';
import { VaultService } from './vault.service';
import { VaultGuard } from './vault.guard';
import { VaultController } from './vault.controller';
import { DocumentFolderService } from './folder.service';
import { DocumentTagService } from './tag.service';
import { TagsController } from './tags.controller';

@Module({
  providers: [
    DocumentService,
    S3Service,
    LocalStorageService,
    storageProviderFactory,
    VaultService,
    VaultGuard,
    DocumentFolderService,
    DocumentTagService,
  ],
  controllers: [DocumentController, StorageController, VaultController, TagsController],
  exports: [DocumentService, S3Service, LocalStorageService, VaultService, DocumentFolderService, DocumentTagService],
})
export class DocumentModule {}
