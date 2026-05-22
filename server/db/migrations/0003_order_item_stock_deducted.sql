ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "stock_deducted" integer DEFAULT 0 NOT NULL;
