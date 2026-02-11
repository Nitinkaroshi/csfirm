import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateFirmDto } from './dto/create-firm.dto';
import { UpdateFirmDto } from './dto/update-firm.dto';
import { Roles } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { FirmStatus } from '@prisma/client';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(JwtAuthGuard, RbacGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @Roles('MASTER_ADMIN')
  async create(@Body() dto: CreateFirmDto) {
    return this.tenantService.create(dto);
  }

  @Get(':id')
  @Roles('MASTER_ADMIN')
  async findById(@Param('id') id: string) {
    return this.tenantService.findById(id);
  }

  @Patch(':id')
  @Roles('MASTER_ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateFirmDto) {
    return this.tenantService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles('MASTER_ADMIN')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: FirmStatus,
  ) {
    return this.tenantService.updateStatus(id, status);
  }
}
