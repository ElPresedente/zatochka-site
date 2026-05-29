ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS extra_payment_id text,
  ADD COLUMN IF NOT EXISTS extra_payment_amount integer,
  ADD COLUMN IF NOT EXISTS extra_payment_status text NOT NULL DEFAULT 'none';
