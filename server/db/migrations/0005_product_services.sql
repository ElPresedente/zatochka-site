ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "services" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "services" text DEFAULT '[]' NOT NULL;
