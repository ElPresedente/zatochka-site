-- Add deletion_requested_at to users so admins can review and approve deletion requests
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletion_requested_at" timestamp;
