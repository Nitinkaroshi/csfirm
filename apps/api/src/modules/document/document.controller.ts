import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StaffRole, DocumentSecurityLevel } from '@prisma/client';
import { DocumentService } from './document.service';
import { DocumentFolderService } from './folder.service';
import { DocumentTagService } from './tag.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentFirm } from '../../common/decorators/current-firm.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { VaultGuard } from './vault.guard';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { CreateFolderDto } from './dto/create-folder.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { ManageDocumentTagsDto } from './dto/manage-tags.dto';
import { MoveDocumentDto } from './dto/move-document.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('cases/:caseId/documents')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly folderService: DocumentFolderService,
    private readonly tagService: DocumentTagService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List documents for a case' })
  async findByCase(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Query('securityLevel') securityLevel?: DocumentSecurityLevel,
  ) {
    return this.documentService.findByCase(caseId, securityLevel);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Request presigned upload URL' })
  async requestUpload(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentFirm() firmId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { filename: string; contentType: string; securityLevel: DocumentSecurityLevel; category?: string },
  ) {
    return this.documentService.requestUploadUrl({
      caseId, firmId, userId,
      filename: body.filename,
      contentType: body.contentType,
      securityLevel: body.securityLevel,
      category: body.category,
    });
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm upload completed' })
  async confirmUpload(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('fileSize') fileSize: number,
  ) {
    return this.documentService.confirmUpload(id, fileSize);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get presigned download URL' })
  async getDownloadUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentService.getDownloadUrl(id);
  }

  @Get(':id/download/sensitive')
  @UseGuards(VaultGuard)
  @ApiOperation({ summary: 'Get download URL for sensitive document (requires vault session)' })
  async getSecureDownloadUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentService.getDownloadUrl(id);
  }

  @Patch(':id/verify')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Mark document as verified' })
  async verify(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.documentService.verify(id, userId);
  }

  @Patch(':id/reject')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Reject document' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.documentService.reject(id, reason);
  }

  @Delete(':id')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Delete document' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentService.delete(id);
  }

  // ============================================================================
  // FOLDER ENDPOINTS
  // ============================================================================

  @Get('folders')
  @ApiOperation({ summary: 'Get folder tree for case' })
  async getFolderTree(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentFirm() firmId: string,
  ) {
    return this.folderService.getFolderTree(caseId, firmId);
  }

  @Post('folders')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Create folder' })
  async createFolder(@Body() dto: CreateFolderDto, @CurrentFirm() firmId: string) {
    return this.folderService.createFolder(dto, firmId);
  }

  @Patch('folders/:folderId')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Update folder' })
  async updateFolder(
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @CurrentFirm() firmId: string,
    @Body() data: { name?: string; color?: string },
  ) {
    return this.folderService.updateFolder(folderId, firmId, data);
  }

  @Delete('folders/:folderId')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Delete folder' })
  async deleteFolder(
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @CurrentFirm() firmId: string,
  ) {
    return this.folderService.deleteFolder(folderId, firmId);
  }

  @Patch(':id/move')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Move document to folder' })
  async moveDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentFirm() firmId: string,
    @Body() dto: MoveDocumentDto,
  ) {
    return this.folderService.moveDocument(id, dto.folderId ?? null, firmId);
  }

  // ============================================================================
  // TAG ENDPOINTS
  // ============================================================================

  @Post(':id/tags')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Add tags to document' })
  async addTags(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentFirm() firmId: string,
    @Body() dto: ManageDocumentTagsDto,
  ) {
    return this.tagService.addTagsToDocument(id, dto.tagIds, firmId);
  }

  @Delete(':id/tags')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Remove tags from document' })
  async removeTags(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentFirm() firmId: string,
    @Body() dto: ManageDocumentTagsDto,
  ) {
    return this.tagService.removeTagsFromDocument(id, dto.tagIds, firmId);
  }

  @Get(':id/tags')
  @ApiOperation({ summary: 'Get tags for document' })
  async getDocumentTags(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentFirm() firmId: string,
  ) {
    return this.tagService.getDocumentTags(id, firmId);
  }
}
