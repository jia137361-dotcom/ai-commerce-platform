-- Import batch 2 - more products

INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_bath_ext_001', 'default_store', 'Custom Bath Mat Set', 'Set of 2 bath mats.', 'draft', 34.99, 12.00),
('prod_bath_ext_002', 'default_store', 'Custom Shower Curtain Liner', 'Waterproof shower curtain liner.', 'draft', 14.99, 5.00),
('prod_bath_ext_003', 'default_store', 'Custom Bath Rug', 'Plush bath rug with custom design.', 'draft', 29.99, 10.00),
('prod_bath_ext_004', 'default_store', 'Custom Soap Dish', 'Ceramic soap dish with custom print.', 'draft', 12.99, 4.00),
('prod_bath_ext_005', 'default_store', 'Custom Bathroom Sign', 'Funny bathroom sign with custom text.', 'draft', 19.99, 6.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_bed_ext_001', 'default_store', 'Custom Bed Sheet Set', 'Egyptian cotton sheet set.', 'draft', 89.99, 32.00),
('prod_bed_ext_002', 'default_store', 'Custom Pillowcase Pair', 'Matching pillowcase set.', 'draft', 24.99, 8.00),
('prod_bed_ext_003', 'default_store', 'Custom Duvet Insert', 'Hypoallergenic duvet insert.', 'draft', 59.99, 22.00),
('prod_bed_ext_004', 'default_store', 'Custom Mattress Protector', 'Waterproof mattress protector.', 'draft', 44.99, 16.00),
('prod_bed_ext_005', 'default_store', 'Custom Bed Skirt', 'Tailored bed skirt with custom design.', 'draft', 39.99, 14.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_kitchen_ext_001', 'default_store', 'Custom Cutting Board Set', 'Set of 3 cutting boards.', 'draft', 39.99, 14.00),
('prod_kitchen_ext_002', 'default_store', 'Custom Knife Block', 'Wooden knife block with custom engraving.', 'draft', 44.99, 16.00),
('prod_kitchen_ext_003', 'default_store', 'Custom Salt and Pepper Shakers', 'Matching salt and pepper set.', 'draft', 19.99, 6.00),
('prod_kitchen_ext_004', 'default_store', 'Custom Butter Dish', 'Ceramic butter dish with custom design.', 'draft', 17.99, 5.50),
('prod_kitchen_ext_005', 'default_store', 'Custom Cookie Jar', 'Decorative cookie jar.', 'draft', 24.99, 8.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_cup_ext_001', 'default_store', 'Custom Espresso Cup', 'Small espresso cup with custom design.', 'draft', 14.99, 4.50),
('prod_cup_ext_002', 'default_store', 'Custom Demitasse Set', 'Set of 4 espresso cups.', 'draft', 34.99, 12.00),
('prod_cup_ext_003', 'default_store', 'Custom Whiskey Glass', 'Crystal whiskey glass.', 'draft', 29.99, 10.00),
('prod_cup_ext_004', 'default_store', 'Custom Champagne Flute', 'Elegant champagne flute.', 'draft', 24.99, 8.00),
('prod_cup_ext_005', 'default_store', 'Custom Cocktail Glass', 'Cocktail glass with custom etching.', 'draft', 22.99, 7.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_sports_ext_001', 'default_store', 'Custom Running Belt', 'Water-resistant running belt.', 'draft', 19.99, 6.00),
('prod_sports_ext_002', 'default_store', 'Custom Gym Towel', 'Quick-dry gym towel with custom design.', 'draft', 14.99, 4.00),
('prod_sports_ext_003', 'default_store', 'Custom Resistance Band Set', 'Set of 3 resistance bands.', 'draft', 19.99, 6.00),
('prod_sports_ext_004', 'default_store', 'Custom Jump Rope', 'Adjustable jump rope.', 'draft', 14.99, 4.00),
('prod_sports_ext_005', 'default_store', 'Custom Foam Roller', 'Muscle recovery foam roller.', 'draft', 29.99, 10.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_car_ext_001', 'default_store', 'Custom Car Coaster Set', 'Set of 2 absorbent car coasters.', 'draft', 12.99, 3.50),
('prod_car_ext_002', 'default_store', 'Custom Car Dashboard Mat', 'Non-slip dashboard mat.', 'draft', 19.99, 6.00),
('prod_car_ext_003', 'default_store', 'Custom Car Keychain', 'Personalized car keychain.', 'draft', 9.99, 2.50),
('prod_car_ext_004', 'default_store', 'Custom Car Window Decal', 'Vinyl window decal.', 'draft', 14.99, 4.00),
('prod_car_ext_005', 'default_store', 'Custom Car Seat Belt Cover', 'Padded seat belt cover.', 'draft', 12.99, 3.50)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_pet_ext_001', 'default_store', 'Custom Pet Portrait', 'Custom pet portrait painting.', 'draft', 49.99, 18.00),
('prod_pet_ext_002', 'default_store', 'Custom Pet Name Tag', 'Engraved pet name tag.', 'draft', 12.99, 3.50),
('prod_pet_ext_003', 'default_store', 'Custom Pet Food Bowl', 'Elevated pet food bowl.', 'draft', 24.99, 8.00),
('prod_pet_ext_004', 'default_store', 'Custom Pet Leash', 'Personalized pet leash.', 'draft', 19.99, 6.00),
('prod_pet_ext_005', 'default_store', 'Custom Pet Jacket', 'Warm pet jacket with custom design.', 'draft', 29.99, 10.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_jewelry_ext_001', 'default_store', 'Custom Birthstone Bracelet', 'Birthstone charm bracelet.', 'draft', 34.99, 12.00),
('prod_jewelry_ext_002', 'default_store', 'Custom Infinity Necklace', 'Infinity symbol necklace.', 'draft', 29.99, 10.00),
('prod_jewelry_ext_003', 'default_store', 'Custom Heart Pendant', 'Heart-shaped pendant.', 'draft', 24.99, 8.00),
('prod_jewelry_ext_004', 'default_store', 'Custom Hoop Earrings', 'Classic hoop earrings.', 'draft', 19.99, 6.00),
('prod_jewelry_ext_005', 'default_store', 'Custom Charm Anklet', 'Delicate charm anklet.', 'draft', 17.99, 5.50)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_holiday_ext_001', 'default_store', 'Custom Christmas Ornament Set', 'Set of 6 ornaments.', 'draft', 39.99, 14.00),
('prod_holiday_ext_002', 'default_store', 'Custom Christmas Pillow Set', 'Set of 2 holiday pillows.', 'draft', 44.99, 16.00),
('prod_holiday_ext_003', 'default_store', 'Custom Christmas Mug Set', 'Set of 4 holiday mugs.', 'draft', 49.99, 18.00),
('prod_holiday_ext_004', 'default_store', 'Custom Christmas Tablecloth', 'Festive tablecloth.', 'draft', 34.99, 12.00),
('prod_holiday_ext_005', 'default_store', 'Custom Christmas Napkin Set', 'Set of 12 napkins.', 'draft', 24.99, 8.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_bag_ext_001', 'default_store', 'Custom Weekend Bag', 'Spacious weekend travel bag.', 'draft', 54.99, 20.00),
('prod_bag_ext_002', 'default_store', 'Custom Toiletry Bag', 'Travel toiletry bag.', 'draft', 24.99, 8.00),
('prod_bag_ext_003', 'default_store', 'Custom Garment Bag', 'Travel garment bag.', 'draft', 44.99, 16.00),
('prod_bag_ext_004', 'default_store', 'Custom Shoe Bag', 'Travel shoe bag.', 'draft', 14.99, 4.00),
('prod_bag_ext_005', 'default_store', 'Custom Jewelry Roll', 'Travel jewelry organizer.', 'draft', 29.99, 10.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_shoes_ext_001', 'default_store', 'Custom Winter Hat', 'Warm winter hat with custom design.', 'draft', 24.99, 8.00),
('prod_shoes_ext_002', 'default_store', 'Custom Sun Hat', 'Wide brim sun hat.', 'draft', 29.99, 10.00),
('prod_shoes_ext_003', 'default_store', 'Custom Hair Accessories Set', 'Set of 5 hair accessories.', 'draft', 14.99, 4.00),
('prod_shoes_ext_004', 'default_store', 'Custom Wristlet', 'Leather wristlet with custom design.', 'draft', 19.99, 6.00),
('prod_shoes_ext_005', 'default_store', 'Custom Keychain Lanyard', 'Custom keychain lanyard.', 'draft', 12.99, 3.50)
ON CONFLICT (id) DO NOTHING;

SELECT 'Batch 2 complete! Total: ' || count(*) || ' products' as result FROM mc_product;
