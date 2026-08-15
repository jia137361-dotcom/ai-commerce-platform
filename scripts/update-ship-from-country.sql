-- Update all products to have ship_from_country based on their supplier
-- S2BDIY products ship from US (print + package in US)

-- First, check how many products need updating
SELECT supplier_id, COUNT(*) as count, 
  MAX(ship_from_country) as current_ship_from
FROM mc_product 
GROUP BY supplier_id;

-- Update all S2BDIY products (supplier_id = 'sup_s2bdiy') to ship from US
UPDATE mc_product 
SET ship_from_country = 'US' 
WHERE supplier_id = 'sup_s2bdiy' 
  AND (ship_from_country IS NULL OR ship_from_country != 'US');

-- Update all mock supplier products to ship from US
UPDATE mc_product 
SET ship_from_country = 'US' 
WHERE supplier_id = 'sup_citigoo_mock' 
  AND (ship_from_country IS NULL OR ship_from_country != 'US');

-- Update any products without supplier_id but with S2BDIY metadata
UPDATE mc_product 
SET ship_from_country = 'US' 
WHERE supplier_id IS NULL 
  AND metadata->>'supplier_product_id' IS NOT NULL
  AND (ship_from_country IS NULL);

-- Verify the updates
SELECT ship_from_country, COUNT(*) as count 
FROM mc_product 
GROUP BY ship_from_country;
