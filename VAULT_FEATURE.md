# Document Vault Feature - Status & Documentation

## 📋 Overview

The **Document Vault** is a security feature designed to protect sensitive documents with an additional authentication layer beyond standard session authentication. It implements a **defense-in-depth** strategy where even with a valid JWT token, users cannot access sensitive documents without unlocking the vault first.

---

## ✅ Implementation Status

### **Status: ✅ IMPLEMENTED (Phase 1)**

The vault feature has been fully implemented with the following components:

| Component | Status | Location |
|-----------|--------|----------|
| **Backend - Vault Service** | ✅ Complete | `apps/api/src/modules/document/vault.service.ts` |
| **Backend - Vault Controller** | ✅ Complete | `apps/api/src/modules/document/vault.controller.ts` |
| **Backend - Vault Guard** | ✅ Complete | `apps/api/src/modules/document/vault.guard.ts` |
| **Database - Security Level** | ✅ Complete | `DocumentSecurityLevel` enum in schema |
| **Database - Vault Access Log** | ✅ Complete | `VaultAccessLog` model in schema |
| **Frontend - Vault Hook** | ✅ Complete | `apps/web/src/hooks/use-vault.ts` |
| **Frontend - Unlock Dialog** | ✅ Complete | `apps/web/src/components/documents/vault-unlock-dialog.tsx` |
| **Redis Session Management** | ✅ Complete | Integrated with RedisService |

---

## 🎯 Requirements (Original Design)

### Security Requirements

#### ✅ **Two-Tier Document Security Model**

Documents are classified into two security levels:

1. **NORMAL (Level 1)** - Standard documents
   - Accessible with standard JWT authentication
   - Regular tenant isolation and permission checks
   - Examples: General correspondence, public filings

2. **SENSITIVE (Level 2)** - Confidential documents
   - Requires vault unlock in addition to JWT
   - Enhanced audit logging
   - Short-lived signed URLs (5 minutes)
   - Examples: ID proofs, financial statements, sensitive contracts

#### ✅ **Vault Session Management**

| Feature | Required | Implemented | Details |
|---------|----------|-------------|---------|
| **Storage** | Redis | ✅ Yes | `vault:{userId}:{caseId}:{timestamp}` |
| **TTL** | Configurable | ✅ Yes | Default: 5 minutes (300s) |
| **Heartbeat** | 30-60 seconds | ✅ Yes | 60 seconds, extends by 2 minutes |
| **Inactivity Timeout** | Configurable | ✅ Yes | Handled by Redis TTL |
| **Auto-lock** | On tab close | ✅ Yes | Via heartbeat failure |
| **Manual Lock** | Lock button | ✅ Yes | `/vault/{caseId}/lock` endpoint |

#### ✅ **Authentication Method**

**Phase 1 (Implemented):**
- ✅ PIN/Password re-entry
- ✅ Rate limiting (handled by backend)
- ✅ Session-based access

**Phase 2 (Planned):**
- ⏳ TOTP/2FA support
- ⏳ Biometric authentication
- ⏳ Hardware key support

#### ✅ **Audit Logging**

All vault access is logged in a dedicated `VaultAccessLog` table:

```sql
-- Vault Access Log Schema
CREATE TABLE vault_access_log (
  id UUID PRIMARY KEY,
  firm_id UUID NOT NULL,
  user_id UUID NOT NULL,
  case_id UUID NOT NULL,
  document_id UUID,
  action VARCHAR (VAULT_ACCESS enum),
  ip_address VARCHAR,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ NOT NULL,
  session_id VARCHAR
);
```

**Logged Actions:**
- ✅ `VIEW` - Document viewed
- ✅ `DOWNLOAD` - Document downloaded
- ✅ `UNLOCK` - Vault unlocked
- ✅ `LOCK` - Vault locked

---

## 🏗️ Architecture

### Backend Flow

```
Document Access Request
    ↓
JWT Authentication (Standard)
    ↓
Tenant Isolation Check
    ↓
Permission Check (RBAC)
    ↓
Is Document SENSITIVE? ──── NO → Generate Signed URL → Return
    ↓ YES
Check Vault Session (VaultGuard)
    ↓
Vault Unlocked? ──── NO → Return 403 + VAULT_LOCKED error
    ↓ YES
Vault Session Valid? ─── NO → Return 403 + VAULT_SESSION_EXPIRED
    ↓ YES
Log Vault Access (Audit)
    ↓
Generate Short-lived Signed URL (5 min)
    ↓
Reset Heartbeat Timer
    ↓
Return Signed URL
```

### API Endpoints

#### ✅ Implemented Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| `POST` | `/vault/{caseId}/unlock` | Unlock vault with PIN | ✅ JWT |
| `POST` | `/vault/{caseId}/lock` | Manually lock vault | ✅ JWT + Vault Session |
| `POST` | `/vault/{caseId}/heartbeat` | Keep vault session alive | ✅ JWT + Vault Session |
| `GET` | `/documents/{id}/download` | Download document (uses VaultGuard) | ✅ JWT + Vault (if SENSITIVE) |

### Frontend Flow

```
User clicks "View" on document
    ↓
Check document security level
    ↓
Is SENSITIVE? ──── NO → Fetch document directly
    ↓ YES
Is Vault Unlocked? ──── YES → Fetch with x-vault-session header
    ↓ NO
Show Vault Unlock Dialog
    ↓
User enters PIN
    ↓
POST /vault/{caseId}/unlock
    ↓
Receive { sessionId, expiresIn }
    ↓
Store sessionId in state
    ↓
Start heartbeat interval (60s)
    ↓
Retry original document request
    ↓
Auto-lock on:
  - Heartbeat failure
  - Manual lock button
  - Tab close (cleanup)
```

---

## 💻 Code Implementation

### Backend - Vault Service

**File:** `apps/api/src/modules/document/vault.service.ts`

**Key Features:**
- ✅ Redis-based session management
- ✅ PIN verification (uses user authentication)
- ✅ Configurable TTL (5 min default)
- ✅ Heartbeat extension (2 min per heartbeat)
- ✅ Audit logging integration
- ✅ Session verification

**Methods:**
```typescript
async unlock(userId, caseId, pin, firmId): Promise<{ sessionId, expiresIn }>
async verifySession(sessionId, userId, caseId): Promise<boolean>
async heartbeat(sessionId, userId, caseId): Promise<{ expiresIn }>
async lock(sessionId, userId, caseId, firmId): Promise<void>
async logVaultAccess(userId, caseId, firmId, action): Promise<void>
```

### Backend - Vault Guard

**File:** `apps/api/src/modules/document/vault.guard.ts`

**Purpose:** Protect document endpoints that access SENSITIVE documents

**How it works:**
1. Checks if document has `securityLevel: SENSITIVE`
2. If NORMAL, allows access
3. If SENSITIVE, requires `x-vault-session` header
4. Validates vault session is active
5. Returns 403 with specific error codes if locked/expired

### Frontend - Vault Hook

**File:** `apps/web/src/hooks/use-vault.ts`

**Features:**
- ✅ State management for vault session
- ✅ Unlock mutation with PIN
- ✅ Automatic heartbeat (60s interval)
- ✅ Manual lock capability
- ✅ Auto-cleanup on unmount
- ✅ Error handling

**Usage Example:**
```typescript
const { isUnlocked, unlock, lock, isUnlocking, error } = useVault(caseId);

// Unlock vault
await unlock(pin);

// Check if unlocked
if (isUnlocked) {
  // Access sensitive document
}

// Manually lock
await lock();
```

### Frontend - Vault Unlock Dialog

**File:** `apps/web/src/components/documents/vault-unlock-dialog.tsx`

**Features:**
- ✅ Modal dialog for PIN entry
- ✅ Loading state during unlock
- ✅ Error display
- ✅ Keyboard shortcuts (Enter to submit, Escape to cancel)

---

## 📊 Database Schema

### DocumentSecurityLevel Enum

```prisma
enum DocumentSecurityLevel {
  NORMAL      // Standard documents
  SENSITIVE   // Vault-protected documents
}
```

### CaseDocument Model (Relevant Fields)

```prisma
model CaseDocument {
  id            String                   @id
  securityLevel DocumentSecurityLevel    @default(NORMAL)
  // ... other fields
}
```

### VaultAccessLog Model

```prisma
model VaultAccessLog {
  id          String      @id @default(uuid())
  firmId      String      @map("firm_id")
  userId      String      @map("user_id")
  caseId      String      @map("case_id")
  documentId  String?     @map("document_id")
  action      VaultAction
  ipAddress   String?     @map("ip_address")
  userAgent   String?     @map("user_agent")
  accessedAt  DateTime    @default(now()) @map("accessed_at")
  sessionId   String?     @map("session_id")

  firm     Firm     @relation(...)
  user     User     @relation(...)
  case_    Case     @relation(...)
  document CaseDocument? @relation(...)
}
```

---

## 🔒 Security Features

### ✅ Implemented Security Measures

1. **Defense in Depth**
   - JWT authentication (Layer 1)
   - Vault session authentication (Layer 2)
   - RBAC permissions (Layer 3)

2. **Session Security**
   - Redis-based sessions (server-side only)
   - Automatic expiration (5 min TTL)
   - Heartbeat-based keepalive
   - No client-side token storage

3. **Audit Trail**
   - All vault access logged
   - IP address tracking
   - User agent logging
   - Timestamp recording
   - Action tracking (VIEW, DOWNLOAD, UNLOCK, LOCK)

4. **Rate Limiting**
   - Backend enforces unlock attempt limits
   - Prevents brute force attacks

5. **Short-lived URLs**
   - Document signed URLs expire in 5 minutes
   - Cannot be reused after expiration

### ⏳ Planned Security Enhancements (Phase 2)

1. **Enhanced Authentication**
   - TOTP/2FA support
   - Biometric authentication
   - Hardware security key integration

2. **Advanced Controls**
   - Per-document access policies
   - Time-based access restrictions
   - Location-based access control

3. **Compliance Features**
   - Detailed compliance reports
   - Export audit logs
   - Data retention policies

---

## 📖 Usage Guide

### For Administrators

#### 1. Mark Document as Sensitive

```typescript
// When uploading document
await uploadDocument({
  caseId: 'case-123',
  file: file,
  securityLevel: 'SENSITIVE', // Mark as sensitive
});
```

#### 2. View Vault Access Logs

Navigate to: **Audit Logs** → Filter by "Vault Access"

You'll see:
- Who accessed which documents
- When they accessed them
- From what IP address
- What action was performed

### For Staff Members

#### 1. Accessing Sensitive Documents

1. Navigate to case documents
2. Click on a document marked with 🔒 (SENSITIVE)
3. Vault Unlock Dialog appears
4. Enter your PIN/password
5. Vault unlocks for 5 minutes
6. Access the document
7. Vault auto-locks after inactivity or tab close

#### 2. Manual Lock

Click the 🔒 "Lock Vault" button in the toolbar to manually lock the vault at any time.

### For Developers

#### 1. Protect Document Endpoint

```typescript
@Get(':documentId/download')
@UseGuards(VaultGuard)  // Apply vault guard
async downloadDocument(@Param('documentId') id: string) {
  // Implementation
}
```

#### 2. Check Vault Status in Frontend

```typescript
const { isUnlocked, unlock } = useVault(caseId);

if (!isUnlocked) {
  // Show unlock dialog
  await unlock(pin);
}

// Now access sensitive document
const url = await fetchDocument(documentId, sessionId);
```

---

## 🎯 Feature Completeness

### Phase 1 (Current) - ✅ COMPLETE

- ✅ Two-tier security model (NORMAL/SENSITIVE)
- ✅ PIN/Password-based unlock
- ✅ Redis session management
- ✅ Heartbeat keepalive
- ✅ Auto-lock on inactivity
- ✅ Manual lock capability
- ✅ Vault access audit logging
- ✅ Frontend vault hook
- ✅ Vault unlock dialog
- ✅ VaultGuard for endpoint protection

### Phase 2 (Planned) - ⏳ PENDING

- ⏳ TOTP/2FA authentication
- ⏳ Biometric authentication
- ⏳ Hardware key support
- ⏳ Per-document access policies
- ⏳ Location-based access control
- ⏳ Advanced compliance reporting
- ⏳ Separate S3 bucket for vault documents
- ⏳ KMS encryption for vault documents

---

## 🧪 Testing

### Manual Testing Steps

#### Test 1: Unlock Vault
1. Login as staff member
2. Navigate to a case with sensitive documents
3. Click on sensitive document
4. Verify unlock dialog appears
5. Enter incorrect PIN → should show error
6. Enter correct PIN → vault unlocks
7. Document should load successfully

#### Test 2: Auto-lock After Inactivity
1. Unlock vault
2. Wait 5 minutes without activity
3. Try to access another sensitive document
4. Should show vault locked error

#### Test 3: Manual Lock
1. Unlock vault
2. Click "Lock Vault" button
3. Vault should lock immediately
4. Accessing sensitive doc should require re-unlock

#### Test 4: Heartbeat
1. Unlock vault
2. Keep tab active
3. Heartbeat should keep vault alive beyond 5 minutes
4. Check Redis for session renewal

---

## 📝 Configuration

### Environment Variables

```env
# Redis (for vault sessions)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Vault Settings (in code, can be moved to env)
VAULT_SESSION_TTL=300        # 5 minutes
VAULT_HEARTBEAT_EXTENSION=120 # 2 minutes
```

### Per-Firm Configuration (Future)

Currently hardcoded, can be made configurable per firm:
- Vault session TTL
- Inactivity timeout
- Heartbeat interval
- Max unlock attempts

---

## 🔧 Troubleshooting

### Issue: Vault won't unlock

**Possible causes:**
- Incorrect PIN
- Redis not running
- Backend not connected to Redis

**Solution:**
- Check Redis connection: `redis-cli ping`
- Verify credentials
- Check backend logs for errors

### Issue: Vault locks too quickly

**Possible causes:**
- Tab in background (heartbeat stops)
- Network issues (heartbeat fails)
- TTL too short

**Solution:**
- Keep tab active
- Check network connectivity
- Adjust `VAULT_SESSION_TTL` if needed

### Issue: Cannot access sensitive documents

**Possible causes:**
- Vault is locked
- Document marked as SENSITIVE
- Missing vault session header

**Solution:**
- Unlock vault first
- Check document security level
- Verify `x-vault-session` header is sent

---

## 📚 Related Documentation

- [Vault Access Design](./docs/architecture/06-vault-access-design.md)
- [Security Architecture](./docs/architecture/09-security-architecture.md)
- [Document Management API](./docs/api/documents.md)

---

## 🎓 Summary

The **Document Vault** feature is **fully implemented and operational** in Phase 1 with:

✅ **Two-tier security** (NORMAL/SENSITIVE documents)
✅ **Redis-based session management**
✅ **PIN/Password authentication**
✅ **Auto-lock with heartbeat**
✅ **Comprehensive audit logging**
✅ **Frontend integration**

**Ready for:** Production use with current security requirements
**Future enhancements:** TOTP, biometric auth, advanced policies (Phase 2)

---

**Last Updated:** February 11, 2026
**Version:** 1.0.0 (Phase 1 Complete)
**Status:** ✅ Production Ready
