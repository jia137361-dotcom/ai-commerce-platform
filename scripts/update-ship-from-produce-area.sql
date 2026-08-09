-- Update ship_from_country based on produce_area_text from S2BDIY products
-- This maps the actual shipping origin to the product

-- First, update products that have S2BDIY metadata with produce_area_text
-- We need to read from the metadata JSON and map to ship_from_country

-- Update products with "国内发全球" (China shipping globally) → CN
UPDATE mc_product 
SET ship_from_country = 'CN' 
WHERE metadata->>'produce_area_text' LIKE '%国内发全球%' 
  AND (ship_from_country IS NULL OR ship_from_country != 'CN');

-- Update products with "美国本土" (US local) → US
UPDATE mc_product 
SET ship_from_country = 'US' 
WHERE metadata->>'produce_area_text' LIKE '%美国本土%' 
  AND (ship_from_country IS NULL OR ship_from_country != 'US');

-- Update products with "英格兰" (England) → GB
UPDATE mc_product 
SET ship_from_country = 'GB' 
WHERE metadata->>'produce_area_text' LIKE '%英格兰%' 
  AND (ship_from_country IS NULL OR ship_from_country != 'GB');

-- Update products with "俄罗斯本土" (Russia local) → RU
UPDATE mc_product 
SET ship_from_country = 'RU' 
WHERE metadata->>'produce_area_text' LIKE '%俄罗斯本土%' 
  AND (ship_from_country IS NULL OR ship_from_country != 'RU');

-- Update products with "澳大利亚本土" (Australia local) → AU
UPDATE mc_product 
SET ship_from_country = 'AU' 
WHERE metadata->>'produce_area_text' LIKE '%澳大利亚本土%' 
  AND (ship_from_country IS NULL OR ship_from_country != 'AU');

-- Update products with "欧洲" (Europe) → EU (we'll use a generic code)
UPDATE mc_product 
SET ship_from_country = 'EU' 
WHERE metadata->>'produce_area_text' LIKE '%欧洲%' 
  AND (ship_from_country IS NULL OR ship_from_country != 'EU');

-- Update products with "DE德国" (Germany) → DE
UPDATE mc_product 
SET ship_from_country = 'DE' 
WHERE metadata->>'produce_area_text' LIKE '%德国%' 
  AND (ship_from_country IS NULL OR ship_from_country != 'DE');

-- Update products with "加拿大本土" (Canada local) → CA
UPDATE mc_product 
SET ship_from_country = 'CA' 
WHERE metadata->>'produce_area_text' LIKE '%加拿大本土%' 
  AND (ship_from_country IS NULL OR ship_from_country != 'CA');

-- Update products with "意大利本土" (Italy local) → IT
UPDATE mc_product 
SET ship_from_country = 'IT' 
WHERE metadata->>'produce_area_text' LIKE '%意大利本土%' 
  AND (ship_from_country IS NULL OR ship_from_country != 'IT');

-- Update products with "法国本土" (France local) → FR
UPDATE mc_product 
SET ship_from_country = 'FR' 
WHERE metadata->>'produce_area_text' LIKE '%法国本土%' 
  AND (ship_from_country IS NULL OR ship_from_country != 'FR');

-- Update products with "韩国本土" (Korea local) → KR
UPDATE mc_product 
SET ship_from_country = 'KR' 
WHERE metadata->>'produce_area_text' LIKE '%韩国本土%' 
  AND (ship_from_country IS NULL OR ship_from_country != 'KR');

-- Update products with "菲律宾本土" (Philippines local) → PH
UPDATE mc_product 
SET ship_from_country = 'PH' 
WHERE metadata->>'produce_area_text' LIKE '%菲律宾本土%' 
  AND (ship_from_country IS NULL OR ship_from_country != 'PH');

-- Update products with "西班牙本土" (Spain local) → ES
UPDATE mc_product 
SET ship_from_country = 'ES' 
WHERE metadata->>'produce_area_text' LIKE '%西班牙本土%' 
  AND (ship_from_country IS NULL OR ship_from_country != 'ES');

-- Update products with "墨西哥本土" (Mexico local) → MX
UPDATE mc_product 
SET ship_from_country = 'MX' 
WHERE metadata->>'produce_area_text' LIKE '%墨西哥本土%' 
  AND (ship_from_country IS NULL OR ship_from_country != 'MX');

-- Update products with "波兰本土" (Poland local) → PL
UPDATE mc_product 
SET ship_from_country = 'PL' 
WHERE metadata->>'produce_area_text' LIKE '%波兰本土%' 
  AND (ship_from_country IS NULL OR ship_from_country != 'PL');

-- Verify the updates
SELECT ship_from_country, COUNT(*) as count 
FROM mc_product 
WHERE ship_from_country IS NOT NULL
GROUP BY ship_from_country 
ORDER BY count DESC;

-- Check how many products still don't have ship_from_country
SELECT COUNT(*) as missing_ship_from 
FROM mc_product 
WHERE ship_from_country IS NULL;
