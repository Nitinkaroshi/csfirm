import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { UserType, StaffRole } from '@prisma/client';
import { JwtPayload } from '@csfirm/shared-types';
import { DomainEvents } from '../../common/constants';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse extends TokenPair {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: UserType;
    role: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Verify firm exists
    const firm = await this.prisma.firm.findUnique({ where: { slug: dto.firmSlug } });
    if (!firm) {
      throw new BadRequestException({ code: 'FIRM_NOT_FOUND', message: 'Firm not found' });
    }

    // Check if email already exists in this firm
    const existingUser = await this.prisma.user.findFirst({
      where: { firmId: firm.id, email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException({
        code: 'EMAIL_EXISTS',
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    // Create user + profile in transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          firmId: firm.id,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          userType: dto.userType,
        },
      });

      if (dto.userType === UserType.STAFF) {
        await tx.employeeProfile.create({
          data: {
            userId: newUser.id,
            firmId: firm.id,
            role: (dto.role as StaffRole) || StaffRole.EMPLOYEE,
            specializations: [],
          },
        });
      } else if (dto.userType === UserType.CLIENT && dto.orgName) {
        const org = await tx.organization.create({
          data: {
            firmId: firm.id,
            name: dto.orgName,
            type: dto.orgType,
          },
        });

        await tx.orgUser.create({
          data: {
            userId: newUser.id,
            orgId: org.id,
            firmId: firm.id,
            role: 'OWNER',
          },
        });
      }

      return newUser;
    });

    this.eventEmitter.emit(DomainEvents.USER_REGISTERED, {
      eventType: DomainEvents.USER_REGISTERED,
      firmId: firm.id,
      actorId: user.id,
      actorRole: dto.userType === UserType.STAFF ? dto.role || 'EMPLOYEE' : 'CLIENT',
      entityType: 'user',
      entityId: user.id,
      data: { email: user.email, userType: user.userType },
      metadata: { requestId: '', timestamp: new Date() },
    });

    const tokens = await this.issueTokenPair(user.id);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        role: dto.userType === UserType.STAFF ? dto.role || 'EMPLOYEE' : 'OWNER',
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    // Find user across all firms by email (firm resolved after)
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
      include: {
        employeeProfile: true,
        orgUsers: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException({
        code: 'ACCOUNT_DISABLED',
        message: 'Your account has been disabled',
      });
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const role = user.employeeProfile?.role || user.orgUsers[0]?.role || 'UNKNOWN';

    const tokens = await this.issueTokenPair(user.id);

    this.eventEmitter.emit(DomainEvents.USER_LOGIN, {
      eventType: DomainEvents.USER_LOGIN,
      firmId: user.firmId,
      actorId: user.id,
      actorRole: String(role),
      entityType: 'user',
      entityId: user.id,
      data: { email: user.email },
      metadata: { requestId: '', timestamp: new Date() },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        role: String(role),
      },
    };
  }

  async refreshTokens(oldRefreshToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(oldRefreshToken);

    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid refresh token',
      });
    }

    if (tokenRecord.isRevoked) {
      // REUSE DETECTED — revoke entire family
      await this.prisma.refreshToken.updateMany({
        where: { family: tokenRecord.family },
        data: { isRevoked: true },
      });

      this.logger.warn(
        `Refresh token reuse detected for user ${tokenRecord.userId}, family ${tokenRecord.family}`,
      );

      throw new UnauthorizedException({
        code: 'TOKEN_REUSE_DETECTED',
        message: 'Security alert: refresh token reuse detected. All sessions have been revoked.',
      });
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_EXPIRED',
        message: 'Refresh token has expired. Please log in again.',
      });
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    // Issue new pair with same family
    return this.issueTokenPair(tokenRecord.userId, tokenRecord.family);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      const tokenRecord = await this.prisma.refreshToken.findFirst({
        where: { tokenHash },
      });

      if (tokenRecord) {
        // Revoke entire family
        await this.prisma.refreshToken.updateMany({
          where: { family: tokenRecord.family },
          data: { isRevoked: true },
        });
      }
    } else {
      // Revoke all tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException({
        code: 'INVALID_PASSWORD',
        message: 'Current password is incorrect',
      });
    }

    const newHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      }),
      // Revoke all refresh tokens — force re-login on all devices
      this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      }),
    ]);
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email },
    });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      return user;
    }
    return null;
  }

  private async issueTokenPair(userId: string, family?: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        employeeProfile: true,
        orgUsers: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokenFamily = family || crypto.randomUUID();

    const payload: JwtPayload = {
      sub: user.id,
      firmId: user.firmId,
      userType: user.userType as 'STAFF' | 'CLIENT',
      role: String(user.employeeProfile?.role || user.orgUsers[0]?.role || 'UNKNOWN'),
      employeeId: user.employeeProfile?.id,
      orgId: user.orgUsers[0]?.orgId,
      tokenFamily,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = this.hashToken(refreshToken);

    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn', '7d');
    const expiresAt = this.calculateExpiry(refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        family: tokenFamily,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private calculateExpiry(duration: string): Date {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const ms: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * (ms[unit] || ms.d));
  }
}
