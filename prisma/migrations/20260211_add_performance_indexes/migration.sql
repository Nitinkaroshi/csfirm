-- Add indexes for common query patterns to improve performance

-- Case queries by firm_id + status (dashboard, case list filtering)
CREATE INDEX IF NOT EXISTS "case_firm_id_status_idx" ON "case"("firm_id", "status");

-- Case queries by firm_id + assigned_to_id (employee workload, my cases)
CREATE INDEX IF NOT EXISTS "case_firm_id_assigned_to_id_idx" ON "case"("firm_id", "assigned_to_id");

-- Case queries by firm_id + org_id (client cases)
CREATE INDEX IF NOT EXISTS "case_firm_id_org_id_idx" ON "case"("firm_id", "org_id");

-- Case queries with recent first (created date DESC)
CREATE INDEX IF NOT EXISTS "case_firm_id_created_at_idx" ON "case"("firm_id", "created_at" DESC);

-- Invoice queries by firm_id + status (revenue analytics, overdue invoices)
CREATE INDEX IF NOT EXISTS "invoice_firm_id_status_idx" ON "invoice"("firm_id", "status");

-- Invoice queries by case (case detail page)
CREATE INDEX IF NOT EXISTS "invoice_case_id_idx" ON "invoice"("case_id");

-- Document queries by case_id (case documents tab)
CREATE INDEX IF NOT EXISTS "case_document_case_id_status_idx" ON "case_document"("case_id", "status");

-- Notification queries by user_id + is_read status (notification badge, list)
CREATE INDEX IF NOT EXISTS "notification_user_id_is_read_idx" ON "notification"("user_id", "is_read");

-- Notification queries with recent first
CREATE INDEX IF NOT EXISTS "notification_user_id_created_at_idx" ON "notification"("user_id", "created_at" DESC);

-- Audit log queries by firm_id + entity (audit trail filtering)
CREATE INDEX IF NOT EXISTS "audit_log_firm_id_entity_type_entity_id_idx" ON "audit"."audit_log"("firm_id", "entity_type", "entity_id");

-- Audit log queries with recent first
CREATE INDEX IF NOT EXISTS "audit_log_firm_id_created_at_idx" ON "audit"."audit_log"("firm_id", "created_at" DESC);

-- User queries by firm_id + user_type (employee list, client list)
CREATE INDEX IF NOT EXISTS "user_firm_id_user_type_status_idx" ON "user"("firm_id", "user_type", "status");

-- Organization queries by firm_id (client list)
CREATE INDEX IF NOT EXISTS "organization_firm_id_idx" ON "organization"("firm_id");

-- Service template queries by firm_id + is_active (active services dropdown)
CREATE INDEX IF NOT EXISTS "service_template_firm_id_is_active_idx" ON "service_template"("firm_id", "is_active");

-- Chat message queries by room_id (chat history)
CREATE INDEX IF NOT EXISTS "chat_message_room_id_created_at_idx" ON "chat_message"("room_id", "created_at" ASC);

-- Case transfer history queries
CREATE INDEX IF NOT EXISTS "case_transfer_log_case_id_created_at_idx" ON "case_transfer_log"("case_id", "created_at" DESC);
