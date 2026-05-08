-- Normalize phone numbers in users table to 10-digit format (without country code).
-- +79001234567 → 9001234567
-- 79001234567  → 9001234567
-- 89001234567  → 9001234567
-- 9001234567   → 9001234567 (already normalized, no change)
WITH normalized AS (
  SELECT id,
    CASE
      WHEN length(regexp_replace(phone, '\D', '', 'g')) = 11
        AND left(regexp_replace(phone, '\D', '', 'g'), 1) IN ('7', '8')
      THEN right(regexp_replace(phone, '\D', '', 'g'), 10)
      WHEN length(regexp_replace(phone, '\D', '', 'g')) = 10
      THEN regexp_replace(phone, '\D', '', 'g')
      ELSE phone
    END AS new_phone
  FROM users
)
UPDATE users u
SET phone = n.new_phone
FROM normalized n
WHERE u.id = n.id
  AND u.phone <> n.new_phone;
