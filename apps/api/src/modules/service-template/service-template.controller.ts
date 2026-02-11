import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StaffRole } from '@prisma/client';
import { ServiceTemplateService } from './service-template.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { CurrentFirm } from '../../common/decorators/current-firm.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Service Templates')
@ApiBearerAuth()
@Controller('services')
export class ServiceTemplateController {
  constructor(private readonly serviceTemplateService: ServiceTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'List service templates' })
  async findAll(
    @CurrentFirm() firmId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('active') active?: boolean,
  ) {
    return this.serviceTemplateService.findMany(firmId, { page, limit, search, active });
  }

  @Get('active')
  @ApiOperation({ summary: 'List active service templates (for case creation)' })
  async findActive(@CurrentFirm() firmId: string) {
    return this.serviceTemplateService.findActiveByFirm(firmId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service template by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.serviceTemplateService.findById(id);
  }

  @Post()
  @UseGuards(RbacGuard)
  @Roles(StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Create service template' })
  async create(@CurrentFirm() firmId: string, @Body() dto: CreateServiceDto) {
    return this.serviceTemplateService.create(firmId, dto);
  }

  @Patch(':id')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Update service template' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateServiceDto) {
    return this.serviceTemplateService.update(id, dto);
  }

  @Post(':id/duplicate')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Duplicate service template' })
  async duplicate(@Param('id', ParseUUIDPipe) id: string, @CurrentFirm() firmId: string) {
    return this.serviceTemplateService.duplicate(id, firmId);
  }

  @Delete(':id')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Deactivate service template' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.serviceTemplateService.deactivate(id);
  }
}
