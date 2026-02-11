import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StaffRole, DeadlineStatus } from '@prisma/client';
import { ComplianceService } from './compliance.service';
import { CreateDeadlineDto } from './dto/create-deadline.dto';
import { UpdateDeadlineDto } from './dto/update-deadline.dto';
import { CurrentFirm } from '../../common/decorators/current-firm.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Compliance Deadlines')
@ApiBearerAuth()
@Controller('compliance/deadlines')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post()
  @UseGuards(RbacGuard)
  @Roles(StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Create compliance deadline' })
  async create(@CurrentFirm() firmId: string, @Body() dto: CreateDeadlineDto) {
    return this.complianceService.create(firmId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all compliance deadlines' })
  @ApiQuery({ name: 'status', enum: DeadlineStatus, required: false })
  @ApiQuery({ name: 'caseId', type: String, required: false })
  @ApiQuery({ name: 'orgId', type: String, required: false })
  @ApiQuery({ name: 'upcoming', type: Boolean, required: false, description: 'Next 30 days only' })
  async findAll(
    @CurrentFirm() firmId: string,
    @Query('status') status?: DeadlineStatus,
    @Query('caseId') caseId?: string,
    @Query('orgId') orgId?: string,
    @Query('upcoming') upcoming?: boolean,
  ) {
    return this.complianceService.findAll(firmId, { status, caseId, orgId, upcoming });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deadline by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentFirm() firmId: string) {
    return this.complianceService.findOne(id, firmId);
  }

  @Patch(':id')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Update deadline' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentFirm() firmId: string,
    @Body() dto: UpdateDeadlineDto,
  ) {
    return this.complianceService.update(id, firmId, dto);
  }

  @Patch(':id/complete')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Mark deadline as completed' })
  async markCompleted(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentFirm() firmId: string,
    @CurrentUser('employeeProfileId') employeeProfileId: string,
  ) {
    return this.complianceService.markCompleted(id, firmId, employeeProfileId);
  }

  @Delete(':id')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Delete deadline' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @CurrentFirm() firmId: string) {
    return this.complianceService.delete(id, firmId);
  }
}
