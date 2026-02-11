# 09 — Security Architecture

## Threat Model

This is a multi-tenant compliance platform handling sensitive financial and identity documents. The security architecture must defend against:

1. **Tenant data leakage** — Firm A seeing Firm B's data
2. **Privilege escalation** — Employee accessing admin functions
3. **Client/staff boundary breach** — Client seeing internal case notes
4. **Document exfiltration** — Unauthorized access to vault documents
5. **Session hijacking** — Token theft, replay attacks
6. **Injection attacks** — SQL injection, XSS, command injection
7. **Insider threats** — Malicious employee accessing other clients' data

---

## Authentication Architecture

### JWT + Refresh Token with Rotation

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                            │
│                                                                   │
│  Login                                                           │
│  ├── POST /auth/login { email, password }                         │
│  ├── Validate credentials (bcrypt compare)                        │
│  ├── Generate JWT access token (15 min TTL)                       │
│  │   Payload: { sub, firmId, userType, role, tokenFamily }       │
│  ├── Generate refresh token (7 day TTL)                           │
│  │   Store hash in DB with family ID                              │
│  ├── Return: { accessToken, refreshToken, expiresIn }            │
│  └── Set refresh token in httpOnly secure cookie                  │
│                                                                   │
│  Token Refresh                                                    │
│  ├── POST /auth/refresh { refreshToken } (or from cookie)         │
│  ├── Validate refresh token exists in DB and not revoked          │
│  ├── Check token family — if family is compromised, REVOKE ALL    │
│  ├── Rotate: invalidate old refresh token, issue new pair         │
│  └── Return new { accessToken, refreshToken }                    │
│                                                                   │
│  Logout                                                          │
│  ├── POST /auth/logout                                            │
│  ├── Revoke current refresh token family                          │
│  └── Clear cookie                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### JWT Payload Structure

```typescript
interface JwtPayload {
  sub: string;          // user.id
  firmId: string;       // tenant ID
  userType: 'STAFF' | 'CLIENT';
  role: string;         // StaffRole or OrgUserRole
  employeeId?: string;  // if STAFF
  orgId?: string;       // if CLIENT
  tokenFamily: string;  // for refresh token rotation detection
  iat: number;
  exp: number;
}
```

### Refresh Token Rotation (Reuse Detection)

```typescript
// modules/auth/auth.service.ts

async refreshTokens(oldRefreshToken: string): Promise<TokenPair> {
  const tokenRecord = await this.prisma.refreshToken.findFirst({
    where: { tokenHash: hash(oldRefreshToken) },
  });

  if (!tokenRecord) {
    throw new UnauthorizedException('Invalid refresh token');
  }

  if (tokenRecord.isRevoked) {
    // REUSE DETECTED — someone is using a stolen token
    // Revoke the entire family (all sessions for this login chain)
    await this.prisma.refreshToken.updateMany({
      where: { family: tokenRecord.family },
      data: { isRevoked: true },
    });

    // Log security event
    this.eventEmitter.emit('security.token_reuse_detected', {
      userId: tokenRecord.userId,
      family: tokenRecord.family,
    });

    throw new UnauthorizedException('Refresh token reuse detected. All sessions revoked.');
  }

  // Revoke old token
  await this.prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { isRevoked: true },
  });

  // Issue new pair with same family
  return this.issueTokenPair(tokenRecord.userId, tokenRecord.family);
}
```

---

## Authorization: RBAC with Guard Chain

### Guard Execution Order

```
Request
  │
  ├── 1. AuthGuard         → Is the JWT valid?
  ├── 2. TenantGuard       → Is the firm active? Does user belong to this firm?
  ├── 3. RBACGuard         → Does the user's role have permission for this action?
  ├── 4. OwnershipGuard    → Does the user own/have access to this specific resource?
  └── 5. VaultGuard        → (Conditional) Is vault session active for sensitive docs?
```

### RBAC Guard Implementation

```typescript
// common/guards/rbac.guard.ts

@Injectable()
export class RBACGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check for @Public() decorator — skip auth entirely
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    if (isPublic) return true;

    // Get required roles from @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no @Roles() specified, allow any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) return false;

    // Map user to their effective role
    const userRole = this.resolveRole(user);
    return requiredRoles.includes(userRole);
  }

  private resolveRole(user: AuthenticatedUser): string {
    if (user.userType === 'CLIENT') return 'CLIENT';
    return user.staffRole; // MASTER_ADMIN, ADMIN, MANAGER, EMPLOYEE
  }
}
```

### Permission Matrix

```typescript
// common/constants/permissions.constants.ts

export const PERMISSIONS = {
  // Case permissions
  'case:create':       ['CLIENT'],
  'case:read:own':     ['CLIENT', 'EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN'],
  'case:read:all':     ['MANAGER', 'ADMIN', 'MASTER_ADMIN'],
  'case:update:status': ['EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN'],
  'case:transfer':     ['MANAGER', 'ADMIN', 'MASTER_ADMIN'],
  'case:delete':       ['MASTER_ADMIN'],
  'case:flag':         ['EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN'],

  // Service template permissions
  'service:create':    ['ADMIN', 'MASTER_ADMIN'],
  'service:update':    ['ADMIN', 'MASTER_ADMIN'],
  'service:delete':    ['MASTER_ADMIN'],
  'service:read':      ['CLIENT', 'EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN'],

  // User management
  'user:create':       ['ADMIN', 'MASTER_ADMIN'],
  'user:update':       ['ADMIN', 'MASTER_ADMIN'],
  'user:delete':       ['MASTER_ADMIN'],
  'user:read':         ['MANAGER', 'ADMIN', 'MASTER_ADMIN'],

  // Invoice
  'invoice:create':    ['ADMIN', 'MASTER_ADMIN'],
  'invoice:update':    ['ADMIN', 'MASTER_ADMIN'],
  'invoice:read:own':  ['CLIENT'],
  'invoice:read:all':  ['MANAGER', 'ADMIN', 'MASTER_ADMIN'],

  // Chat
  'chat:client':       ['CLIENT', 'EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN'],
  'chat:internal':     ['EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN'],

  // Vault
  'vault:access':      ['EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN'],
  'vault:audit:read':  ['ADMIN', 'MASTER_ADMIN'],

  // Audit
  'audit:read':        ['ADMIN', 'MASTER_ADMIN'],

  // Admin
  'admin:dashboard':   ['ADMIN', 'MASTER_ADMIN'],
  'admin:settings':    ['MASTER_ADMIN'],
  'admin:override':    ['MASTER_ADMIN'],
} as const;
```

### Role Decorators

```typescript
// Usage in controllers

@Controller('cases')
@UseGuards(AuthGuard, TenantGuard, RBACGuard)
export class CaseController {

  @Post()
  @Roles('CLIENT')                              // Only clients create cases
  async createCase(@Body() dto: CreateCaseDto) {}

  @Patch(':id/status')
  @Roles('EMPLOYEE', 'MANAGER', 'ADMIN', 'MASTER_ADMIN')  // Only CS staff
  async updateStatus(@Param('id') id: string) {}

  @Post(':id/transfer')
  @Roles('MANAGER', 'ADMIN', 'MASTER_ADMIN')   // Only management
  async transferCase(@Param('id') id: string) {}

  @Delete(':id')
  @Roles('MASTER_ADMIN')                        // Only master admin
  async deleteCase(@Param('id') id: string) {}
}
```

---

## Tenant Isolation

### Middleware: Extract Tenant Context

```typescript
// common/middleware/tenant-context.middleware.ts

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const user = req.user as JwtPayload;
    if (user?.firmId) {
      // Store in AsyncLocalStorage — available throughout the request lifecycle
      this.tenantContext.run(user.firmId, () => next());
    } else {
      next();
    }
  }
}
```

### Prisma Tenant Middleware (Defense in Depth)

Even if a developer forgets to filter by `firmId`, the Prisma middleware enforces it:

```typescript
// database/tenant.middleware.ts

const TENANT_SCOPED_MODELS = [
  'User', 'EmployeeProfile', 'Organization', 'OrgUser',
  'ServiceTemplate', 'Case', 'CaseDocument', 'CaseTransferLog',
  'ChatRoom', 'Invoice', 'Notification',
];

export function tenantMiddleware(
  tenantContext: TenantContextService,
): Prisma.Middleware {
  return async (params, next) => {
    if (!TENANT_SCOPED_MODELS.includes(params.model)) {
      return next(params);
    }

    const firmId = tenantContext.getFirmId();
    if (!firmId) {
      throw new InternalServerErrorException(
        'Tenant context not available. This is a bug.',
      );
    }

    // READ operations: inject firm_id filter
    if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'groupBy'].includes(params.action)) {
      params.args = params.args || {};
      params.args.where = { ...params.args.where, firmId };
    }

    // WRITE operations: inject firm_id into data
    if (['create'].includes(params.action)) {
      params.args.data = { ...params.args.data, firmId };
    }
    if (['createMany'].includes(params.action)) {
      if (Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map(d => ({ ...d, firmId }));
      } else {
        params.args.data = { ...params.args.data, firmId };
      }
    }

    // MUTATION operations: add firm_id to WHERE clause
    if (['update', 'updateMany', 'delete', 'deleteMany', 'upsert'].includes(params.action)) {
      params.args.where = { ...params.args.where, firmId };
    }

    return next(params);
  };
}
```

---

## Audit Interceptor (Automatic Mutation Logging)

```typescript
// common/interceptors/audit.interceptor.ts

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly tenantContext: TenantContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit mutations
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    const user = request.user as AuthenticatedUser;
    const auditAction = this.reflector.get<string>('auditAction', context.getHandler());

    // If no @AuditAction() decorator, skip
    if (!auditAction) {
      return next.handle();
    }

    const requestId = request.headers['x-request-id'];
    const beforeState = request.__auditBeforeState; // Set by service before mutation

    return next.handle().pipe(
      tap(async (responseData) => {
        // Fire-and-forget audit log
        this.auditService.log({
          firmId: user.firmId,
          actorId: user.id,
          actorRole: user.staffRole || user.orgUserRole || 'UNKNOWN',
          entityType: auditAction.split('.')[0],
          entityId: this.extractEntityId(request, responseData),
          action: auditAction,
          beforeState: beforeState || null,
          afterState: responseData?.data || null,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          requestId,
        }).catch((err) => {
          // Never let audit logging failure break the request
          console.error('Audit log failed:', err);
        });
      }),
    );
  }

  private extractEntityId(request: any, response: any): string {
    return request.params?.id || response?.data?.id || 'unknown';
  }
}
```

---

## Input Validation & Sanitization

### Global Validation Pipe

```typescript
// main.ts

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,         // Strip unknown properties
    forbidNonWhitelisted: true,  // Throw on unknown properties
    transform: true,         // Auto-transform types
    transformOptions: {
      enableImplicitConversion: false,  // Explicit typing only
    },
  }),
);
```

### DTO Example with Validation

```typescript
// modules/case/dto/create-case.dto.ts

export class CreateCaseDto {
  @IsUUID()
  serviceId: string;

  @IsUUID()
  orgId: string;

  @IsObject()
  @ValidateNested()
  formData: Record<string, any>; // Validated against service form_schema at service layer

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
```

### Prisma Exception Filter

```typescript
// common/filters/prisma-exception.filter.ts

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    switch (exception.code) {
      case 'P2002': // Unique constraint violation
        response.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_ENTRY',
            message: 'A record with this value already exists',
            field: (exception.meta?.target as string[])?.join(', '),
          },
        });
        break;

      case 'P2025': // Record not found
        response.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'The requested resource was not found',
          },
        });
        break;

      default:
        response.status(500).json({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'An unexpected database error occurred',
          },
        });
    }
  }
}
```

---

## Rate Limiting

### Per-Tenant Rate Limits

```typescript
// Nginx layer (primary):
// limit_req_zone $http_x_tenant_id zone=tenant:10m rate=100r/s;

// Application layer (backup):
@Injectable()
export class TenantRateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const firmId = request.user?.firmId;
    if (!firmId) return true;

    const key = `rate_limit:${firmId}:${Math.floor(Date.now() / 1000)}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 2); // 1-second window

    const limit = 100; // requests per second per tenant
    if (count > limit) {
      throw new ThrottlerException('Rate limit exceeded');
    }

    return true;
  }
}
```

### Sensitive Endpoint Rate Limits

```typescript
// Auth endpoints: stricter limits
// login:     5 attempts per 15 minutes per IP
// register:  3 per hour per IP
// vault/unlock: 5 per 15 minutes per user (handled in VaultService)
```

---

## Security Headers

Set via Nginx + NestJS Helmet:

```typescript
// main.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Tailwind needs this
      imgSrc: ["'self'", "data:", "https://*.amazonaws.com"],
      connectSrc: ["'self'", "wss://*.csfirm.com"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Vault-Token', 'X-Request-ID'],
});
```

---

## Chat Security: Client/Staff Boundary

This is the most critical access control boundary in the system:

```typescript
// modules/chat/guards/room-access.guard.ts

@Injectable()
export class RoomAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    const roomId = request.params.roomId || request.body.roomId;

    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { roomType: true, caseId: true },
    });

    if (!room) throw new NotFoundException('Chat room not found');

    // RULE 1: Clients can NEVER access internal rooms
    if (user.userType === 'CLIENT') {
      if (room.roomType === 'INTERNAL_CASE' || room.roomType === 'INTERNAL_GENERAL') {
        // Don't even tell them the room exists
        throw new NotFoundException('Chat room not found');
      }
    }

    // RULE 2: Client can only access rooms for their org's cases
    if (user.userType === 'CLIENT' && room.caseId) {
      const case_ = await this.prisma.case.findUnique({
        where: { id: room.caseId },
        select: { orgId: true },
      });

      const isOrgMember = await this.prisma.orgUser.findFirst({
        where: { userId: user.id, orgId: case_.orgId },
      });

      if (!isOrgMember) {
        throw new NotFoundException('Chat room not found');
      }
    }

    // RULE 3: Verify user is a member of the room
    const isMember = await this.prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this chat room');
    }

    return true;
  }
}
```

**Note:** For internal rooms, a client gets a `404 Not Found`, NOT a `403 Forbidden`. This prevents information leakage — the client doesn't even know internal rooms exist.

---

## Security Checklist

| Category | Measure | Status |
|----------|---------|--------|
| Authentication | JWT + Refresh Token Rotation | Phase 1 |
| Authentication | Password hashing (bcrypt, cost 12) | Phase 1 |
| Authentication | Email verification | Phase 1 |
| Authorization | RBAC guard chain | Phase 1 |
| Authorization | Tenant isolation (Prisma middleware) | Phase 1 |
| Authorization | Resource ownership checks | Phase 1 |
| Data Protection | S3 SSE-S3 encryption at rest | Phase 1 |
| Data Protection | TLS 1.3 in transit | Phase 1 |
| Data Protection | Signed URLs (no direct S3 access) | Phase 1 |
| Data Protection | Vault session for sensitive docs | Phase 1 |
| Input Security | Global validation pipe (whitelist) | Phase 1 |
| Input Security | Prisma (parameterized queries — SQL injection proof) | Phase 1 |
| Input Security | Helmet security headers | Phase 1 |
| Rate Limiting | Per-tenant (Nginx + app layer) | Phase 1 |
| Rate Limiting | Per-endpoint (auth, vault) | Phase 1 |
| Audit | Full mutation audit trail | Phase 1 |
| Audit | Vault access logging | Phase 1 |
| Audit | Auth event logging | Phase 1 |
| Session | Refresh token reuse detection | Phase 1 |
| Session | Max concurrent sessions per user | Phase 2 |
| Advanced | TOTP/MFA for vault access | Phase 2 |
| Advanced | IP allowlisting per firm | Phase 2 |
| Advanced | Anomaly detection (unusual access patterns) | Phase 2 |
