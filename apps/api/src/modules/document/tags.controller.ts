import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StaffRole } from '@prisma/client';
import { DocumentTagService } from './tag.service';
import { CurrentFirm } from '../../common/decorators/current-firm.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { CreateTagDto } from './dto/create-tag.dto';

@ApiTags('Document Tags')
@ApiBearerAuth()
@Controller('document-tags')
export class TagsController {
  constructor(private readonly tagService: DocumentTagService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tags for firm' })
  async getAllTags(@CurrentFirm() firmId: string) {
    return this.tagService.getAllTags(firmId);
  }

  @Post()
  @UseGuards(RbacGuard)
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Create tag' })
  async createTag(@Body() dto: CreateTagDto, @CurrentFirm() firmId: string) {
    return this.tagService.createTag(dto, firmId);
  }

  @Patch(':id')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Update tag' })
  async updateTag(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentFirm() firmId: string,
    @Body() data: { name?: string; color?: string },
  ) {
    return this.tagService.updateTag(id, firmId, data);
  }

  @Delete(':id')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Delete tag' })
  async deleteTag(@Param('id', ParseUUIDPipe) id: string, @CurrentFirm() firmId: string) {
    return this.tagService.deleteTag(id, firmId);
  }
}
