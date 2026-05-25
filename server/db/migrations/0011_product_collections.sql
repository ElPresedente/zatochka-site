CREATE TABLE IF NOT EXISTS "product_collections" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS "product_collection_items" (
  "collection_id" integer NOT NULL REFERENCES "product_collections"("id") ON DELETE CASCADE,
  "product_id" integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "sort_order" integer DEFAULT 0 NOT NULL,
  PRIMARY KEY("collection_id", "product_id")
);
