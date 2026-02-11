import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { JwtPayload, AuthenticatedUser } from '@csfirm/shared-types';
import { FastifyRequest } from 'fastify';

/**
 * Extract JWT from HTTP-only cookie first, then fall back to
 * Authorization: Bearer header (for Swagger / API testing).
 */
function cookieThenBearerExtractor(req: FastifyRequest): string | null {
  const cookieToken = ((req as any).cookies as Record<string, string>)?.csfirm_access_token;
  if (cookieToken) return cookieToken;
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req as any);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: cookieThenBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub },
      include: {
        employeeProfile: true,
        orgUsers: true,
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (user.firmId !== payload.firmId) {
      throw new UnauthorizedException('Token firm mismatch');
    }

    return {
      userId: user.id,
      id: user.id,
      firmId: user.firmId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType as 'STAFF' | 'CLIENT',
      staffRole: user.employeeProfile?.role,
      employeeId: user.employeeProfile?.id,
      orgId: user.orgUsers[0]?.orgId,
      orgUserRole: user.orgUsers[0]?.role,
    };
  }
}
