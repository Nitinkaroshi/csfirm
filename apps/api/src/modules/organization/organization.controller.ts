import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StaffRole, OrgUserRole } from '@prisma/client';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CurrentFirm } from '../../common/decorators/current-firm.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get()
  @ApiOperation({ summary: 'List client organizations' })
  async findAll(
    @CurrentFirm() firmId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.orgService.findMany(firmId, { page, limit, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgService.findById(id);
  }

  @Post()
  @UseGuards(RbacGuard)
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Create client organization' })
  async create(@CurrentFirm() firmId: string, @Body() dto: CreateOrganizationDto) {
    return this.orgService.create(firmId, dto);
  }

  @Patch(':id')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Update organization' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrganizationDto) {
    return this.orgService.update(id, dto);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List organization members' })
  async getMembers(@Param('id', ParseUUIDPipe) orgId: string) {
    return this.orgService.getMembers(orgId);
  }

  @Post(':id/members')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Add member to organization' })
  async addMember(
    @Param('id', ParseUUIDPipe) orgId: string,
    @Body('userId') userId: string,
    @Body('role') role: OrgUserRole,
  ) {
    return this.orgService.addMember(orgId, userId, role);
  }

  @Delete(':id/members/:userId')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Remove member from organization' })
  async removeMember(
    @Param('id', ParseUUIDPipe) orgId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.orgService.removeMember(orgId, userId);
  }
}
