import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<StaffRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.staffRole) {
      throw new ForbiddenException({
        code: 'ROLE_REQUIRED',
        message: 'Staff role is required for this operation',
      });
    }

    if (!requiredRoles.includes(user.staffRole)) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_ROLE',
        message: `Role ${user.staffRole} does not have permission for this operation`,
      });
    }

    return true;
  }
}
