-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "audit";

-- CreateEnum
CREATE TYPE "public"."UserType" AS ENUM ('STAFF', 'CLIENT');

-- CreateEnum
CREATE TYPE "public"."FirmStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."StaffRole" AS ENUM ('MASTER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "public"."OrgUserRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."CaseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DOCS_REQUIRED', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."CasePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."InternalFlag" AS ENUM ('COMPLIANCE_RISK', 'CLIENT_DELAY', 'WAITING_GOVT_PORTAL', 'DEAD_END', 'PRIORITY_CLIENT');

-- CreateEnum
CREATE TYPE "public"."DocumentSecurityLevel" AS ENUM ('NORMAL', 'SENSITIVE');

-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ChatRoomType" AS ENUM ('CLIENT_CASE', 'INTERNAL_CASE', 'INTERNAL_GENERAL');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('TEXT', 'FILE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "audit"."VaultAction" AS ENUM ('VIEW', 'DOWNLOAD', 'UPLOAD', 'DELETE', 'SHARE');

-- CreateEnum
CREATE TYPE "audit"."AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'TRANSFER', 'LOGIN', 'LOGOUT', 'VAULT_ACCESS');

-- CreateTable
CREATE TABLE "public"."firm" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "domain" VARCHAR(255),
    "subscription_plan" VARCHAR(50) NOT NULL DEFAULT 'trial',
    "status" "public"."FirmStatus" NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "max_users" INTEGER NOT NULL DEFAULT 10,
    "max_storage_gb" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "firm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "user_type" "public"."UserType" NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_token" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "family" VARCHAR(100) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,
    "ip_address" VARCHAR(45),

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_profile" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "role" "public"."StaffRole" NOT NULL,
    "department" VARCHAR(100),
    "designation" VARCHAR(100),
    "max_cases" INTEGER NOT NULL DEFAULT 20,
    "active_cases" INTEGER NOT NULL DEFAULT 0,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "employee_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organization" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50),
    "cin" VARCHAR(50),
    "pan" VARCHAR(20),
    "gst" VARCHAR(20),
    "registered_address" JSONB,
    "contact_info" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."org_user" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "role" "public"."OrgUserRole" NOT NULL DEFAULT 'OWNER',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_template" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "form_schema" JSONB NOT NULL DEFAULT '[]',
    "document_requirements" JSONB NOT NULL DEFAULT '[]',
    "workflow_config" JSONB NOT NULL DEFAULT '{}',
    "sla_config" JSONB NOT NULL DEFAULT '{}',
    "billing_template" JSONB,
    "validation_rules" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "service_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."case" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "case_number" VARCHAR(50) NOT NULL,
    "org_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "assigned_to_id" UUID,
    "status" "public"."CaseStatus" NOT NULL DEFAULT 'DRAFT',
    "internal_flags" "public"."InternalFlag"[],
    "priority" "public"."CasePriority" NOT NULL DEFAULT 'NORMAL',
    "form_data" JSONB NOT NULL DEFAULT '{}',
    "sla_deadline" TIMESTAMPTZ,
    "sla_breached" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."case_document" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_type" VARCHAR(50) NOT NULL,
    "file_size_bytes" BIGINT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "s3_bucket" VARCHAR(100) NOT NULL,
    "s3_key" VARCHAR(500) NOT NULL,
    "document_type" VARCHAR(50) NOT NULL,
    "security_level" "public"."DocumentSecurityLevel" NOT NULL DEFAULT 'NORMAL',
    "description" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "case_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."case_transfer_log" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "from_employee_id" UUID NOT NULL,
    "to_employee_id" UUID NOT NULL,
    "transferred_by" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_transfer_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_room" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "case_id" UUID,
    "room_type" "public"."ChatRoomType" NOT NULL,
    "name" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_room_member" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_room_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_message" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "message_type" "public"."MessageType" NOT NULL DEFAULT 'TEXT',
    "metadata" JSONB,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "tax_breakup" JSONB NOT NULL DEFAULT '{}',
    "total_amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issued_at" TIMESTAMPTZ,
    "due_date" TIMESTAMPTZ,
    "paid_at" TIMESTAMPTZ,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notification" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "channel" "public"."NotificationChannel" NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit"."audit_log" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_role" VARCHAR(30) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" "audit"."AuditAction" NOT NULL,
    "before_state" JSONB,
    "after_state" JSONB,
    "change_summary" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "request_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit"."vault_access_log" (
    "id" UUID NOT NULL,
    "firm_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "action" "audit"."VaultAction" NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "session_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vault_access_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "firm_slug_key" ON "public"."firm"("slug");

-- CreateIndex
CREATE INDEX "user_firm_id_idx" ON "public"."user"("firm_id");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "public"."user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_firm_id_email_key" ON "public"."user"("firm_id", "email");

-- CreateIndex
CREATE INDEX "refresh_token_user_id_idx" ON "public"."refresh_token"("user_id");

-- CreateIndex
CREATE INDEX "refresh_token_token_hash_idx" ON "public"."refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_token_family_idx" ON "public"."refresh_token"("family");

-- CreateIndex
CREATE UNIQUE INDEX "employee_profile_user_id_key" ON "public"."employee_profile"("user_id");

-- CreateIndex
CREATE INDEX "employee_profile_firm_id_idx" ON "public"."employee_profile"("firm_id");

-- CreateIndex
CREATE INDEX "employee_profile_firm_id_role_idx" ON "public"."employee_profile"("firm_id", "role");

-- CreateIndex
CREATE INDEX "employee_profile_firm_id_is_available_active_cases_idx" ON "public"."employee_profile"("firm_id", "is_available", "active_cases");

-- CreateIndex
CREATE INDEX "organization_firm_id_idx" ON "public"."organization"("firm_id");

-- CreateIndex
CREATE INDEX "org_user_firm_id_idx" ON "public"."org_user"("firm_id");

-- CreateIndex
CREATE INDEX "org_user_org_id_idx" ON "public"."org_user"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_user_user_id_org_id_key" ON "public"."org_user"("user_id", "org_id");

-- CreateIndex
CREATE INDEX "service_template_firm_id_is_active_idx" ON "public"."service_template"("firm_id", "is_active");

-- CreateIndex
CREATE INDEX "service_template_firm_id_category_idx" ON "public"."service_template"("firm_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "service_template_firm_id_slug_key" ON "public"."service_template"("firm_id", "slug");

-- CreateIndex
CREATE INDEX "case_firm_id_idx" ON "public"."case"("firm_id");

-- CreateIndex
CREATE INDEX "case_firm_id_org_id_idx" ON "public"."case"("firm_id", "org_id");

-- CreateIndex
CREATE INDEX "case_firm_id_assigned_to_id_status_idx" ON "public"."case"("firm_id", "assigned_to_id", "status");

-- CreateIndex
CREATE INDEX "case_firm_id_status_idx" ON "public"."case"("firm_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "case_firm_id_case_number_key" ON "public"."case"("firm_id", "case_number");

-- CreateIndex
CREATE INDEX "case_document_firm_id_case_id_idx" ON "public"."case_document"("firm_id", "case_id");

-- CreateIndex
CREATE INDEX "case_document_firm_id_security_level_idx" ON "public"."case_document"("firm_id", "security_level");

-- CreateIndex
CREATE INDEX "case_transfer_log_case_id_idx" ON "public"."case_transfer_log"("case_id");

-- CreateIndex
CREATE INDEX "case_transfer_log_firm_id_idx" ON "public"."case_transfer_log"("firm_id");

-- CreateIndex
CREATE INDEX "chat_room_firm_id_case_id_idx" ON "public"."chat_room"("firm_id", "case_id");

-- CreateIndex
CREATE INDEX "chat_room_firm_id_room_type_idx" ON "public"."chat_room"("firm_id", "room_type");

-- CreateIndex
CREATE UNIQUE INDEX "chat_room_member_room_id_user_id_key" ON "public"."chat_room_member"("room_id", "user_id");

-- CreateIndex
CREATE INDEX "chat_message_room_id_created_at_idx" ON "public"."chat_message"("room_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_case_id_key" ON "public"."invoice"("case_id");

-- CreateIndex
CREATE INDEX "invoice_firm_id_case_id_idx" ON "public"."invoice"("firm_id", "case_id");

-- CreateIndex
CREATE INDEX "invoice_firm_id_org_id_idx" ON "public"."invoice"("firm_id", "org_id");

-- CreateIndex
CREATE INDEX "invoice_firm_id_status_idx" ON "public"."invoice"("firm_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_firm_id_invoice_number_key" ON "public"."invoice"("firm_id", "invoice_number");

-- CreateIndex
CREATE INDEX "notification_firm_id_user_id_is_read_created_at_idx" ON "public"."notification"("firm_id", "user_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_firm_id_entity_type_entity_id_created_at_idx" ON "audit"."audit_log"("firm_id", "entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_firm_id_actor_id_created_at_idx" ON "audit"."audit_log"("firm_id", "actor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "vault_access_log_firm_id_document_id_created_at_idx" ON "audit"."vault_access_log"("firm_id", "document_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "vault_access_log_firm_id_user_id_created_at_idx" ON "audit"."vault_access_log"("firm_id", "user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "public"."user" ADD CONSTRAINT "user_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refresh_token" ADD CONSTRAINT "refresh_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_profile" ADD CONSTRAINT "employee_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_profile" ADD CONSTRAINT "employee_profile_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization" ADD CONSTRAINT "organization_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."org_user" ADD CONSTRAINT "org_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."org_user" ADD CONSTRAINT "org_user_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."org_user" ADD CONSTRAINT "org_user_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_template" ADD CONSTRAINT "service_template_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case" ADD CONSTRAINT "case_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case" ADD CONSTRAINT "case_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case" ADD CONSTRAINT "case_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."service_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case" ADD CONSTRAINT "case_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case" ADD CONSTRAINT "case_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."employee_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_document" ADD CONSTRAINT "case_document_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_document" ADD CONSTRAINT "case_document_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_document" ADD CONSTRAINT "case_document_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_document" ADD CONSTRAINT "case_document_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."employee_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_transfer_log" ADD CONSTRAINT "case_transfer_log_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_transfer_log" ADD CONSTRAINT "case_transfer_log_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_transfer_log" ADD CONSTRAINT "case_transfer_log_from_employee_id_fkey" FOREIGN KEY ("from_employee_id") REFERENCES "public"."employee_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_transfer_log" ADD CONSTRAINT "case_transfer_log_to_employee_id_fkey" FOREIGN KEY ("to_employee_id") REFERENCES "public"."employee_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_transfer_log" ADD CONSTRAINT "case_transfer_log_transferred_by_fkey" FOREIGN KEY ("transferred_by") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_room" ADD CONSTRAINT "chat_room_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_room" ADD CONSTRAINT "chat_room_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_room_member" ADD CONSTRAINT "chat_room_member_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."chat_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_room_member" ADD CONSTRAINT "chat_room_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_message" ADD CONSTRAINT "chat_message_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."chat_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_message" ADD CONSTRAINT "chat_message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice" ADD CONSTRAINT "invoice_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice" ADD CONSTRAINT "invoice_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice" ADD CONSTRAINT "invoice_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice" ADD CONSTRAINT "invoice_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."service_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification" ADD CONSTRAINT "notification_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "public"."firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
