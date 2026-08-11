-- 2. Home Furnishings (588 products)

-- Interior Decorations (187)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_decor_001', 'default_store', 'Custom Decorative Painting', 'Canvas decorative painting with custom art.', 'draft', 49.99, 15.00),
('prod_decor_002', 'default_store', 'Custom Tapestry Wall Hanging', 'Woven tapestry with custom design.', 'draft', 59.99, 20.00),
('prod_decor_003', 'default_store', 'Custom Tin Wall Art', 'Vintage tin sign with custom print.', 'draft', 24.99, 8.00),
('prod_decor_004', 'default_store', 'Custom Wooden Wall Art', 'Laser-cut wooden wall art.', 'draft', 39.99, 14.00),
('prod_decor_005', 'default_store', 'Custom Picture Frame Set', 'Set of matching picture frames.', 'draft', 34.99, 12.00),
('prod_decor_006', 'default_store', 'Custom Wall Sign', 'Rustic wall sign with custom text.', 'draft', 29.99, 10.00),
('prod_decor_007', 'default_store', 'Custom Metal Wall Art', 'Modern metal wall art piece.', 'draft', 44.99, 16.00),
('prod_decor_008', 'default_store', 'Custom Glass Wall Art', 'Frosted glass wall decor.', 'draft', 54.99, 20.00),
('prod_decor_009', 'default_store', 'Custom Mirror Wall Art', 'Decorative mirror with custom frame.', 'draft', 69.99, 25.00),
('prod_decor_010', 'default_store', 'Custom LED Wall Sign', 'Illuminated LED wall sign.', 'draft', 49.99, 18.00),
('prod_decor_011', 'default_store', 'Custom Macrame Wall Hanging', 'Handmade macrame wall decor.', 'draft', 44.99, 15.00),
('prod_decor_012', 'default_store', 'Custom Woven Wall Basket', 'Natural woven wall basket set.', 'draft', 39.99, 14.00),
('prod_decor_013', 'default_store', 'Custom Ceramic Wall Vase', 'Modern ceramic wall vase.', 'draft', 34.99, 12.00),
('prod_decor_014', 'default_store', 'Custom Wooden Shelf Set', 'Floating wooden shelf set.', 'draft', 49.99, 18.00),
('prod_decor_015', 'default_store', 'Custom Decorative Clock', 'Stylish wall clock with custom face.', 'draft', 44.99, 16.00),
('prod_decor_016', 'default_store', 'Custom String Art', 'Handcrafted string art piece.', 'draft', 39.99, 14.00),
('prod_decor_017', 'default_store', 'Custom Resin Wall Art', 'Epoxy resin abstract art.', 'draft', 59.99, 22.00),
('prod_decor_018', 'default_store', 'Custom Acrylic Wall Art', 'Transparent acrylic art piece.', 'draft', 44.99, 16.00),
('prod_decor_019', 'default_store', 'Custom Fabric Wall Hanging', 'Bohemian fabric wall decor.', 'draft', 34.99, 12.00),
('prod_decor_020', 'default_store', 'Custom Stone Wall Art', 'Natural stone wall decor.', 'draft', 54.99, 20.00)
ON CONFLICT (id) DO NOTHING;

-- Pillow Series (28)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_pillow_001', 'default_store', 'Custom Throw Pillow', 'Soft throw pillow with custom design.', 'draft', 29.99, 10.00),
('prod_pillow_002', 'default_store', 'Custom Pillow Cover', 'Removable pillow cover with custom print.', 'draft', 19.99, 6.00),
('prod_pillow_003', 'default_store', 'Custom Lumbar Pillow', 'Ergonomic lumbar support pillow.', 'draft', 34.99, 12.00),
('prod_pillow_004', 'default_store', 'Custom Floor Pillow', 'Large floor cushion pillow.', 'draft', 44.99, 16.00),
('prod_pillow_005', 'default_store', 'Custom Body Pillow', 'Full body support pillow.', 'draft', 39.99, 14.00),
('prod_pillow_006', 'default_store', 'Custom Bolster Pillow', 'Cylindrical bolster pillow.', 'draft', 34.99, 12.00),
('prod_pillow_007', 'default_store', 'Custom Memory Foam Pillow', 'Memory foam pillow with custom cover.', 'draft', 49.99, 18.00),
('prod_pillow_008', 'default_store', 'Custom Down Pillow', 'Luxury down-filled pillow.', 'draft', 54.99, 20.00),
('prod_pillow_009', 'default_store', 'Custom Buckwheat Pillow', 'Natural buckwheat hull pillow.', 'draft', 44.99, 16.00),
('prod_pillow_010', 'default_store', 'Custom Cooling Pillow', 'Gel-infused cooling pillow.', 'draft', 49.99, 18.00)
ON CONFLICT (id) DO NOTHING;

-- Bathroom Supplies (29)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_bath_001', 'default_store', 'Custom Shower Curtain', 'Waterproof shower curtain with custom design.', 'draft', 29.99, 10.00),
('prod_bath_002', 'default_store', 'Custom Bath Mat', 'Absorbent bath mat with custom pattern.', 'draft', 24.99, 8.00),
('prod_bath_003', 'default_store', 'Custom Bath Towel Set', 'Luxury bath towel set.', 'draft', 44.99, 16.00),
('prod_bath_004', 'default_store', 'Custom Hand Towel', 'Soft hand towel with custom design.', 'draft', 14.99, 5.00),
('prod_bath_005', 'default_store', 'Custom Bath Robe', 'Plush bath robe with custom monogram.', 'draft', 69.99, 25.00),
('prod_bath_006', 'default_store', 'Custom Toilet Cover Set', 'Matching toilet cover set.', 'draft', 29.99, 10.00),
('prod_bath_007', 'default_store', 'Custom Laundry Basket', 'Woven laundry basket with custom design.', 'draft', 34.99, 12.00),
('prod_bath_008', 'default_store', 'Custom Soap Dispenser', 'Ceramic soap dispenser with custom print.', 'draft', 19.99, 6.00),
('prod_bath_009', 'default_store', 'Custom Toothbrush Holder', 'Matching toothbrush holder.', 'draft', 14.99, 5.00),
('prod_bath_010', 'default_store', 'Custom Tissue Box Cover', 'Decorative tissue box cover.', 'draft', 19.99, 7.00)
ON CONFLICT (id) DO NOTHING;

-- Bedding (36)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_bed_001', 'default_store', 'Custom Duvet Cover', 'Premium duvet cover with custom design.', 'draft', 79.99, 28.00),
('prod_bed_002', 'default_store', 'Custom Sheet Set', 'Egyptian cotton sheet set.', 'draft', 89.99, 32.00),
('prod_bed_003', 'default_store', 'Custom Pillowcase Set', 'Matching pillowcase set.', 'draft', 29.99, 10.00),
('prod_bed_004', 'default_store', 'Custom Blanket', 'Cozy fleece blanket with custom pattern.', 'draft', 49.99, 18.00),
('prod_bed_005', 'default_store', 'Custom Quilt', 'Handstitched quilt with custom design.', 'draft', 99.99, 35.00),
('prod_bed_006', 'default_store', 'Custom Bed Runner', 'Decorative bed runner.', 'draft', 39.99, 14.00),
('prod_bed_007', 'default_store', 'Custom Bed Skirt', 'Tailored bed skirt.', 'draft', 44.99, 16.00),
('prod_bed_008', 'default_store', 'Custom Throw Blanket', 'Lightweight throw blanket.', 'draft', 39.99, 14.00),
('prod_bed_009', 'default_store', 'Custom Weighted Blanket', 'Therapeutic weighted blanket.', 'draft', 79.99, 28.00),
('prod_bed_010', 'default_store', 'Custom Electric Blanket', 'Heated blanket with custom cover.', 'draft', 89.99, 32.00)
ON CONFLICT (id) DO NOTHING;

-- Cupwares (42)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_cup_001', 'default_store', 'Custom Ceramic Mug', '11oz ceramic mug with wraparound print.', 'draft', 19.99, 4.25),
('prod_cup_002', 'default_store', 'Custom Coffee Mug', '15oz coffee mug with custom design.', 'draft', 22.99, 5.00),
('prod_cup_003', 'default_store', 'Custom Travel Mug', 'Insulated travel mug with custom print.', 'draft', 29.99, 8.00),
('prod_cup_004', 'default_store', 'Custom Glass Mug', 'Clear glass mug with custom design.', 'draft', 24.99, 7.00),
('prod_cup_005', 'default_store', 'Custom Enamel Mug', 'Vintage enamel camping mug.', 'draft', 19.99, 6.00),
('prod_cup_006', 'default_store', 'Custom Coaster Set', 'Set of 4 absorbent coasters.', 'draft', 14.99, 3.00),
('prod_cup_007', 'default_store', 'Custom Wine Glass', 'Elegant wine glass with custom etching.', 'draft', 24.99, 8.00),
('prod_cup_008', 'default_store', 'Custom Beer Glass', 'Pint glass with custom design.', 'draft', 19.99, 6.00),
('prod_cup_009', 'default_store', 'Custom Tumbler', 'Stainless steel tumbler with custom print.', 'draft', 29.99, 10.00),
('prod_cup_010', 'default_store', 'Custom Water Bottle', 'Reusable water bottle with custom design.', 'draft', 24.99, 8.00)
ON CONFLICT (id) DO NOTHING;

-- Kitchen Supplies (36)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_kitchen_001', 'default_store', 'Custom Apron', 'Adjustable kitchen apron with custom design.', 'draft', 24.99, 8.00),
('prod_kitchen_002', 'default_store', 'Custom Oven Mitt', 'Heat-resistant oven mitt with custom print.', 'draft', 14.99, 5.00),
('prod_kitchen_003', 'default_store', 'Custom Cutting Board', 'Bamboo cutting board with custom engraving.', 'draft', 29.99, 10.00),
('prod_kitchen_004', 'default_store', 'Custom Kitchen Towel Set', 'Cotton kitchen towel set.', 'draft', 19.99, 6.00),
('prod_kitchen_005', 'default_store', 'Custom Pot Holder', 'Quilted pot holder with custom design.', 'draft', 12.99, 4.00),
('prod_kitchen_006', 'default_store', 'Custom Trivet', 'Heat-resistant trivet with custom design.', 'draft', 19.99, 6.00),
('prod_kitchen_007', 'default_store', 'Custom Spice Jar Labels', 'Matching spice jar label set.', 'draft', 14.99, 4.00),
('prod_kitchen_008', 'default_store', 'Custom Refrigerator Magnets', 'Set of decorative fridge magnets.', 'draft', 12.99, 3.50),
('prod_kitchen_009', 'default_store', 'Custom Tea Towel', 'Cotton tea towel with custom print.', 'draft', 14.99, 4.50),
('prod_kitchen_010', 'default_store', 'Custom Placemat Set', 'Set of 4 placemats with custom design.', 'draft', 24.99, 8.00)
ON CONFLICT (id) DO NOTHING;

-- Holiday Decorations (85)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_holiday_001', 'default_store', 'Custom Christmas Ornament', 'Hand-painted ornament with custom design.', 'draft', 14.99, 4.00),
('prod_holiday_002', 'default_store', 'Custom Christmas Stocking', 'Personalized Christmas stocking.', 'draft', 24.99, 8.00),
('prod_holiday_003', 'default_store', 'Custom Christmas Tree Skirt', 'Decorative tree skirt with custom design.', 'draft', 39.99, 14.00),
('prod_holiday_004', 'default_store', 'Custom Christmas Wreath', 'Festive wreath with custom accents.', 'draft', 44.99, 16.00),
('prod_holiday_005', 'default_store', 'Custom Christmas Pillow', 'Holiday throw pillow.', 'draft', 29.99, 10.00),
('prod_holiday_006', 'default_store', 'Custom Christmas Table Runner', 'Festive table runner.', 'draft', 34.99, 12.00),
('prod_holiday_007', 'default_store', 'Custom Christmas Mug', 'Holiday-themed mug.', 'draft', 19.99, 6.00),
('prod_holiday_008', 'default_store', 'Custom Christmas T-Shirt', 'Festive holiday t-shirt.', 'draft', 24.99, 8.00),
('prod_holiday_009', 'default_store', 'Custom Christmas Blanket', 'Cozy holiday blanket.', 'draft', 49.99, 18.00),
('prod_holiday_010', 'default_store', 'Custom Christmas Doormat', 'Welcome doormat with holiday design.', 'draft', 29.99, 10.00)
ON CONFLICT (id) DO NOTHING;

-- Sports & Outdoors (20)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_sports_001', 'default_store', 'Custom Beach Towel', 'Oversized beach towel with custom design.', 'draft', 29.99, 10.00),
('prod_sports_002', 'default_store', 'Custom Golf Towel', 'Microfiber golf towel with custom logo.', 'draft', 14.99, 4.00),
('prod_sports_003', 'default_store', 'Custom Yoga Mat', 'Non-slip yoga mat with custom design.', 'draft', 39.99, 12.00),
('prod_sports_004', 'default_store', 'Custom Gym Bag', 'Durable gym bag with custom design.', 'draft', 34.99, 12.00),
('prod_sports_005', 'default_store', 'Custom Sports Water Bottle', 'Insulated sports water bottle.', 'draft', 24.99, 8.00),
('prod_sports_006', 'default_store', 'Custom Cooler Bag', 'Insulated cooler bag with custom print.', 'draft', 39.99, 14.00),
('prod_sports_007', 'default_store', 'Custom Picnic Blanket', 'Waterproof picnic blanket.', 'draft', 34.99, 12.00),
('prod_sports_008', 'default_store', 'Custom Beach Umbrella', 'UV protection beach umbrella.', 'draft', 59.99, 22.00),
('prod_sports_009', 'default_store', 'Custom Carrying Case', 'Custom carrying case for equipment.', 'draft', 29.99, 10.00),
('prod_sports_010', 'default_store', 'Custom Headband', 'Sweat-wicking sports headband.', 'draft', 14.99, 4.00)
ON CONFLICT (id) DO NOTHING;

-- Car Accessories (47)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_car_001', 'default_store', 'Custom Car Floor Mats', 'Personalized car floor mat set.', 'draft', 49.99, 18.00),
('prod_car_002', 'default_store', 'Custom Car Seat Covers', 'Protective seat covers with custom design.', 'draft', 59.99, 22.00),
('prod_car_003', 'default_store', 'Custom Steering Wheel Cover', 'Leather steering wheel cover.', 'draft', 24.99, 8.00),
('prod_car_004', 'default_store', 'Custom Car Air Freshener', 'Hanging car air freshener.', 'draft', 9.99, 2.50),
('prod_car_005', 'default_store', 'Custom Car Sun Shade', 'Reflective car sun shade.', 'draft', 29.99, 10.00),
('prod_car_006', 'default_store', 'Custom Car Trash Can', 'Compact car trash can.', 'draft', 19.99, 6.00),
('prod_car_007', 'default_store', 'Custom Car Cup Holder', 'Universal car cup holder.', 'draft', 14.99, 5.00),
('prod_car_008', 'default_store', 'Custom License Plate Frame', 'Chrome license plate frame.', 'draft', 14.99, 4.00),
('prod_car_009', 'default_store', 'Custom Car Mirror Hang', 'Decorative rearview mirror hang.', 'draft', 12.99, 3.50),
('prod_car_010', 'default_store', 'Custom Car Phone Mount', 'Universal car phone mount.', 'draft', 19.99, 7.00)
ON CONFLICT (id) DO NOTHING;

-- Digital Accessories (273)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_digital_001', 'default_store', 'Custom Phone Case - Silicone', 'Flexible silicone case with custom design.', 'draft', 24.99, 6.75),
('prod_digital_002', 'default_store', 'Custom Phone Case - Leather', 'Premium leather case with custom print.', 'draft', 34.99, 12.00),
('prod_digital_003', 'default_store', 'Custom Phone Case - Clear', 'Transparent case with custom design.', 'draft', 19.99, 5.00),
('prod_digital_004', 'default_store', 'Custom Mouse Pad - Standard', 'Standard mouse pad with custom design.', 'draft', 14.99, 4.00),
('prod_digital_005', 'default_store', 'Custom Mouse Pad - XL', 'Extra large mouse pad with custom design.', 'draft', 24.99, 8.00),
('prod_digital_006', 'default_store', 'Custom Laptop Sleeve', 'Neoprene laptop sleeve with custom design.', 'draft', 29.99, 10.00),
('prod_digital_007', 'default_store', 'Custom Tablet Case', 'Protective tablet case with custom design.', 'draft', 29.99, 10.00),
('prod_digital_008', 'default_store', 'Custom Keyboard Cover', 'Silicone keyboard cover with custom print.', 'draft', 14.99, 4.00),
('prod_digital_009', 'default_store', 'Custom Headphone Case', 'Padded headphone case with custom design.', 'draft', 19.99, 6.00),
('prod_digital_010', 'default_store', 'Custom Webcam Cover', 'Sliding webcam cover with custom design.', 'draft', 9.99, 2.50)
ON CONFLICT (id) DO NOTHING;

-- Pet Supplies (33)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_pet_001', 'default_store', 'Custom Pet Bandana', 'Adjustable bandana for pets.', 'draft', 14.99, 4.00),
('prod_pet_002', 'default_store', 'Custom Pet Collar', 'Personalized pet collar.', 'draft', 19.99, 6.00),
('prod_pet_003', 'default_store', 'Custom Pet Bed', 'Cozy pet bed with custom design.', 'draft', 49.99, 18.00),
('prod_pet_004', 'default_store', 'Custom Pet Bowl', 'Ceramic pet bowl with custom print.', 'draft', 19.99, 6.00),
('prod_pet_005', 'default_store', 'Custom Pet Toy', 'Durable pet toy with custom pattern.', 'draft', 12.99, 3.50),
('prod_pet_006', 'default_store', 'Custom Pet Sweater', 'Warm pet sweater with custom design.', 'draft', 24.99, 8.00),
('prod_pet_007', 'default_store', 'Custom Pet Carrier Bag', 'Travel carrier bag for small pets.', 'draft', 39.99, 14.00),
('prod_pet_008', 'default_store', 'Custom Pet Tag', 'Personalized pet ID tag.', 'draft', 14.99, 4.00),
('prod_pet_009', 'default_store', 'Custom Pet Blanket', 'Soft pet blanket with custom design.', 'draft', 29.99, 10.00),
('prod_pet_010', 'default_store', 'Custom Cat Scratching Post', 'Cat scratching post with custom cover.', 'draft', 44.99, 16.00)
ON CONFLICT (id) DO NOTHING;

-- Jewelry (38)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_jewelry_001', 'default_store', 'Custom Name Necklace', 'Personalized name necklace in gold or silver.', 'draft', 34.99, 10.00),
('prod_jewelry_002', 'default_store', 'Custom Charm Bracelet', 'Beaded bracelet with custom charms.', 'draft', 24.99, 7.00),
('prod_jewelry_003', 'default_store', 'Custom Drop Earrings', 'Handcrafted drop earrings with custom design.', 'draft', 19.99, 5.00),
('prod_jewelry_004', 'default_store', 'Custom Initial Pendant', 'Gold or silver initial pendant.', 'draft', 29.99, 9.00),
('prod_jewelry_005', 'default_store', 'Custom Birthstone Ring', 'Personalized birthstone ring.', 'draft', 39.99, 12.00),
('prod_jewelry_006', 'default_store', 'Custom Cuff Links', 'Engraved cuff links set.', 'draft', 24.99, 8.00),
('prod_jewelry_007', 'default_store', 'Custom Tie Clip', 'Personalized tie clip.', 'draft', 19.99, 6.00),
('prod_jewelry_008', 'default_store', 'Custom Anklet', 'Delicate anklet with custom charms.', 'draft', 22.99, 7.00),
('prod_jewelry_009', 'default_store', 'Custom Brooch', 'Decorative brooch with custom design.', 'draft', 17.99, 5.50),
('prod_jewelry_010', 'default_store', 'Custom Locket Necklace', 'Photo locket necklace.', 'draft', 34.99, 11.00)
ON CONFLICT (id) DO NOTHING;

-- Protective Equipment (32)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_protect_001', 'default_store', 'Custom Face Mask', 'Reusable cloth face mask with custom design.', 'draft', 14.99, 3.50),
('prod_protect_002', 'default_store', 'Custom Neck Gaiter', 'Multi-use neck gaiter with custom print.', 'draft', 12.99, 3.00),
('prod_protect_003', 'default_store', 'Custom Headband', 'Moisture-wicking headband with custom design.', 'draft', 12.99, 3.00),
('prod_protect_004', 'default_store', 'Custom Wristband', 'Absorbent wristband with custom logo.', 'draft', 9.99, 2.50),
('prod_protect_005', 'default_store', 'Custom Sun Protection Sleeve', 'UV protection arm sleeves.', 'draft', 14.99, 4.00)
ON CONFLICT (id) DO NOTHING;

-- Bags (131)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_bag_001', 'default_store', 'Custom Canvas Tote Bag', 'Canvas tote bag with custom print.', 'draft', 24.99, 8.00),
('prod_bag_002', 'default_store', 'Custom Backpack', 'Durable backpack with custom design.', 'draft', 44.99, 18.00),
('prod_bag_003', 'default_store', 'Custom Laptop Backpack', 'Padded laptop backpack.', 'draft', 49.99, 20.00),
('prod_bag_004', 'default_store', 'Custom Messenger Bag', 'Crossbody messenger bag.', 'draft', 39.99, 14.00),
('prod_bag_005', 'default_store', 'Custom Drawstring Bag', 'Lightweight drawstring bag.', 'draft', 14.99, 4.00),
('prod_bag_006', 'default_store', 'Custom Duffel Bag', 'Spacious duffel bag for travel.', 'draft', 44.99, 16.00),
('prod_bag_007', 'default_store', 'Custom Gym Bag', 'Water-resistant gym bag.', 'draft', 34.99, 12.00),
('prod_bag_008', 'default_store', 'Custom Beach Bag', 'Oversized beach tote.', 'draft', 29.99, 10.00),
('prod_bag_009', 'default_store', 'Custom Lunch Bag', 'Insulated lunch bag with custom design.', 'draft', 19.99, 7.00),
('prod_bag_010', 'default_store', 'Custom Cosmetic Bag', 'Travel cosmetic bag with custom print.', 'draft', 19.99, 6.00)
ON CONFLICT (id) DO NOTHING;

-- Shoes & Accessories (141)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_shoes_001', 'default_store', 'Custom Baseball Cap', 'Adjustable cap with embroidered design.', 'draft', 29.99, 7.50),
('prod_shoes_002', 'default_store', 'Custom Bucket Hat', 'Reversible bucket hat with custom design.', 'draft', 24.99, 6.00),
('prod_shoes_003', 'default_store', 'Custom Beanie', 'Warm knit beanie with custom embroidery.', 'draft', 19.99, 5.00),
('prod_shoes_004', 'default_store', 'Custom Visor', 'Adjustable sun visor.', 'draft', 19.99, 5.00),
('prod_shoes_005', 'default_store', 'Custom Beret', 'Classic beret with custom design.', 'draft', 22.99, 7.00),
('prod_shoes_006', 'default_store', 'Custom Scarf', 'Soft scarf with custom pattern.', 'draft', 24.99, 8.00),
('prod_shoes_007', 'default_store', 'Custom Gloves', 'Leather gloves with custom lining.', 'draft', 29.99, 10.00),
('prod_shoes_008', 'default_store', 'Custom Socks Set', 'Pack of 3 pairs with custom design.', 'draft', 19.99, 5.00),
('prod_shoes_009', 'default_store', 'Custom Belt', 'Genuine leather belt with custom buckle.', 'draft', 34.99, 12.00),
('prod_shoes_010', 'default_store', 'Custom Tie', 'Silk tie with custom pattern.', 'draft', 24.99, 8.00)
ON CONFLICT (id) DO NOTHING;

SELECT 'All remaining products imported!' as result;
