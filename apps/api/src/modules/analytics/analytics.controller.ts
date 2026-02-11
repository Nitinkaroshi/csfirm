import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StaffRole } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { CurrentFirm } from '../../common/decorators/current-firm.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(RbacGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Get dashboard metrics' })
  async getDashboardMetrics(@CurrentFirm() firmId: string) {
    return this.analyticsService.getDashboardMetrics(firmId);
  }

  @Get('cases/trends')
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Get case trends over time' })
  async getCaseTrends(
    @CurrentFirm() firmId: string,
    @Query('days') days?: number,
  ) {
    return this.analyticsService.getCaseTrends(firmId, days ? parseInt(String(days)) : 30);
  }

  @Get('revenue/trends')
  @Roles(StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Get revenue trends' })
  async getRevenueTrends(
    @CurrentFirm() firmId: string,
    @Query('months') months?: number,
  ) {
    return this.analyticsService.getRevenueTrends(firmId, months ? parseInt(String(months)) : 6);
  }

  @Get('employees/performance')
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Get employee performance metrics' })
  async getEmployeePerformance(@CurrentFirm() firmId: string) {
    return this.analyticsService.getEmployeePerformance(firmId);
  }

  @Get('services/metrics')
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Get service metrics' })
  async getServiceMetrics(@CurrentFirm() firmId: string) {
    return this.analyticsService.getServiceMetrics(firmId);
  }
}
