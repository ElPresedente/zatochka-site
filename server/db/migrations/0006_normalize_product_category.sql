-- Add hidden flag to product_categories
ALTER TABLE "product_categories" ADD COLUMN "hidden" boolean DEFAULT false NOT NULL;

-- Create the special fallback category
INSERT INTO "product_categories" (name, sort_order, hidden)
VALUES ('Без категории', 2147483647, true)
ON CONFLICT (name) DO UPDATE SET hidden = true, sort_order = 2147483647;

-- Add category_id (nullable while we backfill)
ALTER TABLE "products" ADD COLUMN "category_id" integer;

-- Fill from existing category name
UPDATE "products" p
SET category_id = pc.id
FROM "product_categories" pc
WHERE pc.name = p.category;

-- Any products with no matching category go to "Без категории"
UPDATE "products"
SET category_id = (SELECT id FROM "product_categories" WHERE name = 'Без категории')
WHERE category_id IS NULL;

-- Make NOT NULL and add FK
ALTER TABLE "products" ALTER COLUMN "category_id" SET NOT NULL;
ALTER TABLE "products"
  ADD CONSTRAINT "products_category_id_product_categories_id_fk"
  FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT;

-- Drop old text column
ALTER TABLE "products" DROP COLUMN "category";
