import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';

@Injectable()
export class DocumentFolderService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get folder hierarchy for a case (tree structure)
   */
  async getFolderTree(caseId: string, firmId: string) {
    const folders = await this.prisma.documentFolder.findMany({
      where: {
        caseId,
        firmId,
      },
      include: {
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build tree structure
    const folderMap = new Map<string, any>();
    const rootFolders: any[] = [];

    // First pass: create folder objects
    folders.forEach((folder: any) => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
      });
    });

    // Second pass: build hierarchy
    folders.forEach((folder: any) => {
      const folderNode = folderMap.get(folder.id);
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children.push(folderNode);
        }
      } else {
        rootFolders.push(folderNode);
      }
    });

    return rootFolders;
  }

  /**
   * Create a new folder
   */
  async createFolder(dto: CreateFolderDto, firmId: string) {
    // Validate case access
    const caseRecord = await this.prisma.case.findFirst({
      where: { id: dto.caseId, firmId },
    });

    if (!caseRecord) {
      throw new NotFoundException('Case not found');
    }

    // Validate parent folder if provided
    if (dto.parentId) {
      const parentFolder = await this.prisma.documentFolder.findFirst({
        where: { id: dto.parentId, caseId: dto.caseId, firmId },
      });

      if (!parentFolder) {
        throw new BadRequestException('Parent folder not found');
      }
    }

    // Check for duplicate name at same level
    const existing = await this.prisma.documentFolder.findFirst({
      where: {
        caseId: dto.caseId,
        parentId: dto.parentId || null,
        name: dto.name,
        firmId,
      },
    });

    if (existing) {
      throw new BadRequestException('Folder with this name already exists at this level');
    }

    return this.prisma.documentFolder.create({
      data: {
        firmId,
        caseId: dto.caseId,
        parentId: dto.parentId,
        name: dto.name,
        color: dto.color,
      },
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });
  }

  /**
   * Update folder name/color
   */
  async updateFolder(
    folderId: string,
    firmId: string,
    data: { name?: string; color?: string },
  ) {
    const folder = await this.prisma.documentFolder.findFirst({
      where: { id: folderId, firmId },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    // Check for duplicate name if renaming
    if (data.name && data.name !== folder.name) {
      const existing = await this.prisma.documentFolder.findFirst({
        where: {
          caseId: folder.caseId,
          parentId: folder.parentId,
          name: data.name,
          firmId,
          id: { not: folderId },
        },
      });

      if (existing) {
        throw new BadRequestException('Folder with this name already exists at this level');
      }
    }

    return this.prisma.documentFolder.update({
      where: { id: folderId },
      data,
    });
  }

  /**
   * Delete folder (must be empty)
   */
  async deleteFolder(folderId: string, firmId: string) {
    const folder = await this.prisma.documentFolder.findFirst({
      where: { id: folderId, firmId },
      include: {
        documents: true,
        children: true,
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if (folder.documents.length > 0) {
      throw new BadRequestException('Cannot delete folder with documents. Move or delete documents first.');
    }

    if (folder.children.length > 0) {
      throw new BadRequestException('Cannot delete folder with subfolders. Delete subfolders first.');
    }

    await this.prisma.documentFolder.delete({
      where: { id: folderId },
    });

    return { message: 'Folder deleted successfully' };
  }

  /**
   * Move document to folder
   */
  async moveDocument(documentId: string, folderId: string | null, firmId: string) {
    const document = await this.prisma.caseDocument.findFirst({
      where: { id: documentId, firmId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Validate folder if provided
    if (folderId) {
      const folder = await this.prisma.documentFolder.findFirst({
        where: {
          id: folderId,
          caseId: document.caseId,
          firmId,
        },
      });

      if (!folder) {
        throw new BadRequestException('Target folder not found');
      }
    }

    return this.prisma.caseDocument.update({
      where: { id: documentId },
      data: { folderId },
    });
  }
}
