-- AlterTable: Add Razorpay payment tracking fields to invoice table
ALTER TABLE "public"."invoice"
ADD COLUMN "razorpay_order_id" VARCHAR(100),
ADD COLUMN "razorpay_payment_id" VARCHAR(100),
ADD COLUMN "razorpay_signature" VARCHAR(255),
ADD COLUMN "payment_method" VARCHAR(50),
ADD COLUMN "payment_attempts" INTEGER NOT NULL DEFAULT 0;

-- Add index on razorpay_order_id for faster lookups
CREATE INDEX "invoice_razorpay_order_id_idx" ON "public"."invoice"("razorpay_order_id");
