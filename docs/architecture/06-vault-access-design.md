# 06 — Document Vault Access Design

## Overview

The vault system protects sensitive documents (Level 2: ID proofs, financial docs) with an additional authentication layer beyond the standard session. It implements defense-in-depth: even if an attacker has a valid JWT, they cannot access sensitive documents without completing the vault unlock challenge.

---

## Two-Tier Document Security Model

```
┌─────────────────────────────────────────────────────────┐
│                  Document Request                        │
│                                                          │
│  security_level = NORMAL (Level 1)                       │
│  ├── Standard JWT auth ✓                                 │
│  ├── Tenant isolation ✓                                  │
│  ├── Case access permission ✓                            │
│  └── Generate signed URL → return to client              │
│                                                          │
│  security_level = SENSITIVE (Level 2)                    │
│  ├── Standard JWT auth ✓                                 │
│  ├── Tenant isolation ✓                                  │
│  ├── Case access permission ✓                            │
│  ├── Vault session active? ────────── NO → 403 + prompt  │
│  │   │                                      vault unlock │
│  │   YES                                                 │
│  │   ├── Vault session not expired? ── NO → 403 + re-auth│
│  │   │   │                                               │
│  │   │   YES                                             │
│  │   │   ├── Log vault access to audit                   │
│  │   │   ├── Generate short-lived signed URL (5 min)     │
│  │   │   ├── Reset vault inactivity timer                │
│  │   │   └── Return signed URL                           │
│  │   │                                                   │
└──┴───┴───────────────────────────────────────────────────┘
```

---

## Vault Session Lifecycle

```
┌──────────┐     Password/PIN      ┌──────────┐
│  Locked  │ ─────────────────────▶│ Unlocked │
│          │   + Rate limited       │          │
│          │   + Audit logged       │  TTL: N  │
└──────────┘                        │  minutes │
     ▲                              └────┬─────┘
     │                                   │
     │    Inactivity timeout             │  Every vault access
     │    OR manual lock                 │  resets inactivity
     │    OR session expired             │  timer
     │                                   │
     └───────────────────────────────────┘
```

### Vault Session Properties

| Property | Value | Notes |
|----------|-------|-------|
| Storage | Redis | `vault_session:{user_id}:{firm_id}` |
| TTL | 15 minutes (configurable per firm) | Hard expiry — auto-lock |
| Inactivity timeout | 5 minutes (configurable) | Reset on each vault access |
| Auth method | Password re-entry (Phase 1) | Phase 2: TOTP/biometric |
| Max unlock attempts | 5 per 15 minutes | Rate limited per user |
| Lock on tab close | Yes (frontend heartbeat) | Heartbeat every 30s |

---

## Implementation

### Vault Service

```typescript
// modules/document/vault/vault.service.ts

@Injectable()
export class VaultService {
  private readonly VAULT_PREFIX = 'vault_session';
  private readonly UNLOCK_ATTEMPTS_PREFIX = 'vault_attempts';

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
  ) {}

  /**
   * Unlock the vault by re-authenticating
   */
  async unlockVault(
    userId: string,
    firmId: string,
    password: string,
    context: RequestContext,
  ): Promise<{ sessionToken: string; expiresAt: Date }> {
    // Rate limit check
    const attemptsKey = `${this.UNLOCK_ATTEMPTS_PREFIX}:${userId}`;
    const attempts = await this.redis.incr(attemptsKey);
    if (attempts === 1) {
      await this.redis.expire(attemptsKey, 900); // 15 min window
    }
    if (attempts > 5) {
      throw new TooManyRequestsException(
        'Too many vault unlock attempts. Try again in 15 minutes.',
      );
    }

    // Verify password
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    const isValid = await this.hashService.verify(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Reset attempt counter on success
    await this.redis.del(attemptsKey);

    // Create vault session
    const sessionToken = crypto.randomUUID();
    const sessionKey = `${this.VAULT_PREFIX}:${userId}:${firmId}`;
    const firmSettings = await this.getFirmVaultSettings(firmId);

    const sessionData = {
      token: sessionToken,
      userId,
      firmId,
      unlockedAt: new Date().toISOString(),
      lastAccessAt: new Date().toISOString(),
      ipAddress: context.ipAddress,
    };

    await this.redis.set(
      sessionKey,
      JSON.stringify(sessionData),
      'EX',
      firmSettings.vaultTtlSeconds, // Hard TTL
    );

    // Audit log
    await this.logVaultAction({
      firmId,
      userId,
      action: 'VAULT_UNLOCKED',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      sessionToken,
      expiresAt: addSeconds(new Date(), firmSettings.vaultTtlSeconds),
    };
  }

  /**
   * Validate vault session is active and not timed out by inactivity
   */
  async validateVaultSession(
    userId: string,
    firmId: string,
    sessionToken: string,
  ): Promise<boolean> {
    const sessionKey = `${this.VAULT_PREFIX}:${userId}:${firmId}`;
    const raw = await this.redis.get(sessionKey);
    if (!raw) return false;

    const session = JSON.parse(raw);
    if (session.token !== sessionToken) return false;

    // Check inactivity timeout
    const firmSettings = await this.getFirmVaultSettings(firmId);
    const lastAccess = new Date(session.lastAccessAt);
    const inactiveSeconds = differenceInSeconds(new Date(), lastAccess);

    if (inactiveSeconds > firmSettings.inactivityTimeoutSeconds) {
      await this.lockVault(userId, firmId);
      return false;
    }

    // Reset inactivity timer
    session.lastAccessAt = new Date().toISOString();
    const remainingTtl = await this.redis.ttl(sessionKey);
    await this.redis.set(sessionKey, JSON.stringify(session), 'EX', remainingTtl);

    return true;
  }

  /**
   * Explicitly lock the vault
   */
  async lockVault(userId: string, firmId: string): Promise<void> {
    const sessionKey = `${this.VAULT_PREFIX}:${userId}:${firmId}`;
    await this.redis.del(sessionKey);
  }

  /**
   * Heartbeat — called by frontend every 30s to keep vault alive
   */
  async heartbeat(userId: string, firmId: string, sessionToken: string): Promise<boolean> {
    return this.validateVaultSession(userId, firmId, sessionToken);
  }

  private async getFirmVaultSettings(firmId: string) {
    // Default settings, overridable per firm
    return {
      vaultTtlSeconds: 900,          // 15 minutes hard limit
      inactivityTimeoutSeconds: 300, // 5 minutes inactivity
    };
  }
}
```

### Vault Guard

```typescript
// modules/document/vault/vault.guard.ts

@Injectable()
export class VaultGuard implements CanActivate {
  constructor(
    private readonly vaultService: VaultService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const documentId = request.params.documentId;

    // Check if the document is sensitive
    const document = await this.prisma.caseDocument.findUnique({
      where: { id: documentId },
      select: { securityLevel: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Level 1 docs don't need vault
    if (document.securityLevel === 'NORMAL') {
      return true;
    }

    // Level 2: Require vault session
    const vaultToken = request.headers['x-vault-token'];
    if (!vaultToken) {
      throw new ForbiddenException({
        code: 'VAULT_LOCKED',
        message: 'Vault access required. Please unlock the vault first.',
      });
    }

    const isValid = await this.vaultService.validateVaultSession(
      user.id,
      user.firmId,
      vaultToken,
    );

    if (!isValid) {
      throw new ForbiddenException({
        code: 'VAULT_SESSION_EXPIRED',
        message: 'Vault session has expired. Please re-authenticate.',
      });
    }

    return true;
  }
}
```

### Vault Access Controller

```typescript
// modules/document/document.controller.ts

@Controller('documents')
@UseGuards(AuthGuard, TenantGuard, RBACGuard)
export class DocumentController {

  @Post('vault/unlock')
  async unlockVault(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UnlockVaultDto,
    @Req() req: Request,
  ) {
    return this.vaultService.unlockVault(
      user.id,
      user.firmId,
      dto.password,
      { ipAddress: req.ip, userAgent: req.headers['user-agent'] },
    );
  }

  @Post('vault/lock')
  async lockVault(@CurrentUser() user: AuthenticatedUser) {
    await this.vaultService.lockVault(user.id, user.firmId);
    return { success: true };
  }

  @Post('vault/heartbeat')
  async vaultHeartbeat(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-vault-token') vaultToken: string,
  ) {
    const alive = await this.vaultService.heartbeat(
      user.id,
      user.firmId,
      vaultToken,
    );
    return { active: alive };
  }

  @Get(':documentId/download')
  @UseGuards(VaultGuard)  // ← Only applied to download/view endpoints
  async getDocumentUrl(
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const signedUrl = await this.documentService.generateSignedUrl(documentId);

    // Audit log for ALL document access (Level 1 and Level 2)
    await this.auditService.logDocumentAccess({
      firmId: user.firmId,
      userId: user.id,
      documentId,
      action: 'VIEW',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      vaultSessionId: req.headers['x-vault-token'] as string,
    });

    return { url: signedUrl, expiresIn: 300 }; // 5 min signed URL
  }
}
```

---

## S3 Integration

### Signed URL Generation

```typescript
// modules/document/s3/s3.service.ts

@Injectable()
export class S3Service {
  private readonly s3: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.s3 = new S3Client({
      region: configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  /**
   * Generate upload pre-signed URL (client uploads directly to S3)
   */
  async generateUploadUrl(params: {
    bucket: string;
    key: string;
    contentType: string;
    maxSizeBytes: number;
  }): Promise<{ uploadUrl: string; fields: Record<string, string> }> {
    const presigned = await createPresignedPost(this.s3, {
      Bucket: params.bucket,
      Key: params.key,
      Conditions: [
        ['content-length-range', 0, params.maxSizeBytes],
        ['eq', '$Content-Type', params.contentType],
      ],
      Fields: {
        'Content-Type': params.contentType,
      },
      Expires: 600, // 10 minutes to complete upload
    });

    return { uploadUrl: presigned.url, fields: presigned.fields };
  }

  /**
   * Generate download pre-signed URL
   */
  async generateDownloadUrl(params: {
    bucket: string;
    key: string;
    expiresInSeconds?: number;
  }): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    });

    return getSignedUrl(this.s3, command, {
      expiresIn: params.expiresInSeconds || 300, // Default 5 min
    });
  }
}
```

### S3 Key Structure

```
s3://{bucket}/
  {firm_id}/
    cases/
      {case_id}/
        documents/
          {document_id}/{original_filename}
    vault/                              ← Sensitive docs in separate prefix
      {case_id}/
        {document_id}/{original_filename}
```

Sensitive documents use a separate S3 prefix (`vault/` vs `cases/`). This allows:
- Different S3 bucket policies per prefix
- CloudTrail logging scoped to vault prefix
- Future: separate KMS key for vault encryption

### S3 Lifecycle Rules

```json
{
  "Rules": [
    {
      "ID": "archive-old-documents",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "Transitions": [
        {
          "Days": 365,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 730,
          "StorageClass": "GLACIER"
        }
      ]
    },
    {
      "ID": "vault-stricter-lifecycle",
      "Status": "Enabled",
      "Filter": { "Prefix": "vault/" },
      "Transitions": [
        {
          "Days": 180,
          "StorageClass": "STANDARD_IA"
        }
      ]
    }
  ]
}
```

---

## Frontend Vault Flow

```
User clicks "View" on sensitive document
  ↓
Frontend checks: Is vault unlocked? (local state + x-vault-token header)
  ├── YES → Call GET /documents/{id}/download with x-vault-token header
  │          ↓
  │          Receive signed URL → Open in secure viewer
  │
  └── NO → Show Vault Unlock Modal
              ↓
            User enters password
              ↓
            POST /documents/vault/unlock { password }
              ↓
            Receive { sessionToken, expiresAt }
              ↓
            Store in Zustand vault store
              ↓
            Start heartbeat interval (every 30s)
              ↓
            Retry original request with x-vault-token header
              ↓
            Auto-lock on:
              - Tab hidden for > inactivityTimeout
              - User clicks "Lock Vault"
              - Browser close (beforeunload)
              - Heartbeat returns { active: false }
```

### Zustand Vault Store

```typescript
// stores/vault.store.ts

interface VaultState {
  isUnlocked: boolean;
  sessionToken: string | null;
  expiresAt: Date | null;
  heartbeatInterval: NodeJS.Timeout | null;

  unlock: (sessionToken: string, expiresAt: Date) => void;
  lock: () => void;
  startHeartbeat: () => void;
  stopHeartbeat: () => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  isUnlocked: false,
  sessionToken: null,
  expiresAt: null,
  heartbeatInterval: null,

  unlock: (sessionToken, expiresAt) => {
    set({ isUnlocked: true, sessionToken, expiresAt });
    get().startHeartbeat();
  },

  lock: () => {
    get().stopHeartbeat();
    set({ isUnlocked: false, sessionToken: null, expiresAt: null });
    // Fire lock request to backend
    api.post('/documents/vault/lock').catch(() => {});
  },

  startHeartbeat: () => {
    const interval = setInterval(async () => {
      const { sessionToken } = get();
      if (!sessionToken) return;

      try {
        const res = await api.post('/documents/vault/heartbeat', null, {
          headers: { 'x-vault-token': sessionToken },
        });
        if (!res.data.active) {
          get().lock();
        }
      } catch {
        get().lock();
      }
    }, 30_000); // 30 seconds

    set({ heartbeatInterval: interval });
  },

  stopHeartbeat: () => {
    const { heartbeatInterval } = get();
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    set({ heartbeatInterval: null });
  },
}));

// Auto-lock on tab visibility change
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Start inactivity countdown (handled by backend)
      // Frontend stops heartbeat when tab is hidden
      useVaultStore.getState().stopHeartbeat();
    } else {
      // Tab visible again — check if vault is still active
      const { sessionToken } = useVaultStore.getState();
      if (sessionToken) {
        useVaultStore.getState().startHeartbeat();
      }
    }
  });
}
```

---

## Vault Access Audit Trail

Every sensitive document access is logged in `vault_access_log`:

```
| user_id | document_id | case_id | action   | ip_address  | timestamp           |
|---------|-------------|---------|----------|-------------|---------------------|
| uuid-1  | doc-abc     | case-1  | VIEW     | 192.168.1.5 | 2026-02-09 10:30:00 |
| uuid-1  | doc-abc     | case-1  | DOWNLOAD | 192.168.1.5 | 2026-02-09 10:31:00 |
| uuid-2  | doc-def     | case-1  | VIEW     | 10.0.0.15   | 2026-02-09 11:00:00 |
```

This audit trail is:
- **Append-only** — no updates, no deletes
- **Partitioned by month** — for query performance and archival
- **Queryable by admins** — "Who accessed this document and when?"
- **Separate from general audit log** — vault access is security-critical and warrants its own table
