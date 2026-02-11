import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class DocumentTagService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all tags for a firm
   */
  async getAllTags(firmId: string) {
    return this.prisma.documentTag.findMany({
      where: { firmId },
      include: {
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create a new tag
   */
  async createTag(dto: CreateTagDto, firmId: string) {
    // Check for duplicate
    const existing = await this.prisma.documentTag.findFirst({
      where: {
        firmId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new BadRequestException('Tag with this name already exists');
    }

    return this.prisma.documentTag.create({
      data: {
        firmId,
        name: dto.name,
        color: dto.color,
      },
    });
  }

  /**
   * Update tag
   */
  async updateTag(tagId: string, firmId: string, data: { name?: string; color?: string }) {
    const tag = await this.prisma.documentTag.findFirst({
      where: { id: tagId, firmId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Check for duplicate name if renaming
    if (data.name && data.name !== tag.name) {
      const existing = await this.prisma.documentTag.findFirst({
        where: {
          firmId,
          name: data.name,
          id: { not: tagId },
        },
      });

      if (existing) {
        throw new BadRequestException('Tag with this name already exists');
      }
    }

    return this.prisma.documentTag.update({
      where: { id: tagId },
      data,
    });
  }

  /**
   * Delete tag
   */
  async deleteTag(tagId: string, firmId: string) {
    const tag = await this.prisma.documentTag.findFirst({
      where: { id: tagId, firmId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Deleting tag will cascade delete all tag links
    await this.prisma.documentTag.delete({
      where: { id: tagId },
    });

    return { message: 'Tag deleted successfully' };
  }

  /**
   * Add tags to document
   */
  async addTagsToDocument(documentId: string, tagIds: string[], firmId: string) {
    const document = await this.prisma.caseDocument.findFirst({
      where: { id: documentId, firmId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Validate all tags exist and belong to firm
    const tags = await this.prisma.documentTag.findMany({
      where: {
        id: { in: tagIds },
        firmId,
      },
    });

    if (tags.length !== tagIds.length) {
      throw new BadRequestException('One or more tags not found');
    }

    // Create tag links (ignore duplicates)
    await this.prisma.$transaction(
      tagIds.map((tagId) =>
        this.prisma.documentTagLink.upsert({
          where: {
            documentId_tagId: {
              documentId,
              tagId,
            },
          },
          create: {
            documentId,
            tagId,
          },
          update: {},
        }),
      ),
    );

    return this.getDocumentTags(documentId, firmId);
  }

  /**
   * Remove tags from document
   */
  async removeTagsFromDocument(documentId: string, tagIds: string[], firmId: string) {
    const document = await this.prisma.caseDocument.findFirst({
      where: { id: documentId, firmId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.prisma.documentTagLink.deleteMany({
      where: {
        documentId,
        tagId: { in: tagIds },
      },
    });

    return this.getDocumentTags(documentId, firmId);
  }

  /**
   * Get all tags for a document
   */
  async getDocumentTags(documentId: string, firmId: string) {
    const links = await this.prisma.documentTagLink.findMany({
      where: {
        documentId,
        document: {
          firmId,
        },
      },
      include: {
        tag: true,
      },
    });

    return links.map((link: any) => link.tag);
  }
}
