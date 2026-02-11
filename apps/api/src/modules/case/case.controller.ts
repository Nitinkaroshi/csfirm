import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StaffRole, CaseStatus, CasePriority } from '@prisma/client';
import { CaseService } from './case.service';
import { BulkOperationsService } from './bulk-operations.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { TransferCaseDto } from './dto/transfer-case.dto';
import { BulkAssignDto } from './dto/bulk-assign.dto';
import { BulkStatusDto } from './dto/bulk-status.dto';
import { BulkFlagDto } from './dto/bulk-flag.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentFirm } from '../../common/decorators/current-firm.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';
import { AllowedRole } from './state-machine/case-state-machine';

@ApiTags('Cases')
@ApiBearerAuth()
@Controller('cases')
export class CaseController {
  constructor(
    private readonly caseService: CaseService,
    private readonly bulkOps: BulkOperationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List cases' })
  async findAll(
    @CurrentFirm() firmId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: CaseStatus,
    @Query('priority') priority?: CasePriority,
    @Query('assignedToId') assignedToId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('serviceId') serviceId?: string,
    @Query('search') search?: string,
  ) {
    return this.caseService.findMany(firmId, {
      page, limit, status, priority, assignedToId, organizationId, serviceId, search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get case by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.caseService.findById(id);
  }

  @Get(':id/transitions')
  @ApiOperation({ summary: 'Get available status transitions for a case' })
  async getTransitions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { staffRole?: StaffRole; type: string },
  ) {
    const role: AllowedRole = user.type === 'CLIENT' ? 'CLIENT' : user.staffRole!;
    return this.caseService.getAvailableTransitions(id, role);
  }

  @Post()
  @ApiOperation({ summary: 'Create new case' })
  async create(
    @CurrentFirm() firmId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateCaseDto,
  ) {
    return this.caseService.create(firmId, userId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transition case status' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; staffRole?: StaffRole; type: string; firmId: string },
    @Body() dto: UpdateStatusDto,
  ) {
    const role: AllowedRole = user.type === 'CLIENT' ? 'CLIENT' : user.staffRole!;
    return this.caseService.updateStatus(id, user.userId, role, user.firmId, dto);
  }

  @Patch(':id/assign')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Manually assign case to employee' })
  async assignCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('employeeProfileId') employeeProfileId: string,
  ) {
    return this.caseService.assignCase(id, employeeProfileId);
  }

  @Post(':id/transfer')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Transfer case to another employee' })
  async transferCase(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @CurrentFirm() firmId: string,
    @Body() dto: TransferCaseDto,
  ) {
    return this.caseService.transferCase(id, userId, firmId, dto);
  }

  @Get(':id/transfers')
  @ApiOperation({ summary: 'Get case transfer history' })
  async getTransferHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.caseService.getTransferHistory(id);
  }

  @Post(':id/flags')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Add internal flag to case' })
  async addFlag(@Param('id', ParseUUIDPipe) id: string, @Body('flag') flag: string) {
    return this.caseService.addFlag(id, flag);
  }

  @Patch(':id/flags/remove')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Remove internal flag from case' })
  async removeFlag(@Param('id', ParseUUIDPipe) id: string, @Body('flag') flag: string) {
    return this.caseService.removeFlag(id, flag);
  }

  @Post('bulk/assign')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Bulk assign cases to employee' })
  async bulkAssign(@CurrentFirm() firmId: string, @Body() dto: BulkAssignDto) {
    return this.bulkOps.bulkAssignCases(dto.caseIds, dto.employeeProfileId, firmId);
  }

  @Post('bulk/status')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Bulk update case statuses' })
  async bulkUpdateStatus(
    @CurrentUser() user: { userId: string; staffRole?: StaffRole },
    @CurrentFirm() firmId: string,
    @Body() dto: BulkStatusDto,
  ) {
    return this.bulkOps.bulkUpdateStatus(dto.caseIds, dto.status, user.userId, user.staffRole!, firmId);
  }

  @Post('bulk/flag/add')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Bulk add flag to cases' })
  async bulkAddFlag(@Body() dto: BulkFlagDto) {
    return this.bulkOps.bulkAddFlag(dto.caseIds, dto.flag);
  }

  @Post('bulk/flag/remove')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Bulk remove flag from cases' })
  async bulkRemoveFlag(@Body() dto: BulkFlagDto) {
    return this.bulkOps.bulkRemoveFlag(dto.caseIds, dto.flag);
  }
}
