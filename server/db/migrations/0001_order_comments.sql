ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "user_comment" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "seller_comment" text DEFAULT '' NOT NULL;
