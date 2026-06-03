ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'pickup',
  ADD COLUMN IF NOT EXISTS delivery_scope text,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS delivery_coords text,
  ADD COLUMN IF NOT EXISTS delivery_cost integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cdek_pvz_code text,
  ADD COLUMN IF NOT EXISTS cdek_pvz_address text,
  ADD COLUMN IF NOT EXISTS cdek_pvz_city text,
  ADD COLUMN IF NOT EXISTS cdek_tariff_code integer,
  ADD COLUMN IF NOT EXISTS cdek_delivery_days_min integer,
  ADD COLUMN IF NOT EXISTS cdek_delivery_days_max integer,
  ADD COLUMN IF NOT EXISTS cdek_order_uuid text;
