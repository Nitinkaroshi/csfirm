import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StaffRole, UserType } from '@prisma/client';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentFirm } from '../../common/decorators/current-firm.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'List users in firm' })
  async findAll(
    @CurrentFirm() firmId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: UserType,
    @Query('search') search?: string,
  ) {
    return this.userService.findMany(firmId, { page, limit, type, search });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('userId') userId: string) {
    return this.userService.findById(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile (name, phone)' })
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    const safeDto: UpdateUserDto = {};
    if (dto.firstName) safeDto.firstName = dto.firstName;
    if (dto.lastName) safeDto.lastName = dto.lastName;
    if (dto.phone !== undefined) safeDto.phone = dto.phone;
    return this.userService.update(userId, safeDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findById(id);
  }

  @Post()
  @UseGuards(RbacGuard)
  @Roles(StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Create staff user' })
  async create(@CurrentFirm() firmId: string, @Body() dto: CreateUserDto) {
    return this.userService.createStaffUser(firmId, dto);
  }

  @Patch(':id')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Update user' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Deactivate user' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.deactivate(id);
  }
}
