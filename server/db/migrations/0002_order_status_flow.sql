ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_status_check";
--> statement-breakpoint
UPDATE "orders" SET "status" = 'created' WHERE "status" = 'pending';
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'created';
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_status_check" CHECK ("status" in ('created', 'cancelled', 'accepted', 'in_progress', 'ready', 'completed'));
