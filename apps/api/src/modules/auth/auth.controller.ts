import { Controller, Post, Get, Body, UseGuards, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { CookieService } from './cookie.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public, CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '@csfirm/shared-types';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.register(dto);
    this.cookieService.setAuthCookies(reply, result.accessToken, result.refreshToken);
    return { user: result.user, expiresIn: result.expiresIn };
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.login(dto);
    this.cookieService.setAuthCookies(reply, result.accessToken, result.refreshToken);
    return { user: result.user, expiresIn: result.expiresIn };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const refreshToken = ((request as any).cookies as Record<string, string>)?.csfirm_refresh_token;

    if (!refreshToken) {
      this.cookieService.clearAuthCookies(reply);
      throw new UnauthorizedException('No refresh token provided');
    }

    const tokens = await this.authService.refreshTokens(refreshToken);
    this.cookieService.setAuthCookies(reply, tokens.accessToken, tokens.refreshToken);
    return { expiresIn: tokens.expiresIn };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const refreshToken = ((request as any).cookies as Record<string, string>)?.csfirm_refresh_token;
    await this.authService.logout(user.userId, refreshToken);
    this.cookieService.clearAuthCookies(reply);
    return { message: 'Logged out successfully' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
    this.cookieService.clearAuthCookies(reply);
    return { message: 'Password changed successfully. Please log in again.' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
