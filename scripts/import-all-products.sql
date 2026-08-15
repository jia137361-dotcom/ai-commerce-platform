-- S2BDIY 完整产品目录导入 (1513 products)
-- 所有产品都有英文标题和描述

-- ============================================================
-- 1. Clothing & Underwear (188 products)
-- ============================================================

-- Men's Clothing (123)
-- T-shirts (46)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_mens_tshirt_001', 'default_store', 'Custom Mens Classic T-Shirt', 'Premium cotton t-shirt with custom design. Classic fit for everyday wear.', 'draft', 29.99, 8.50),
('prod_mens_tshirt_002', 'default_store', 'Custom Mens Slim Fit T-Shirt', 'Modern slim fit t-shirt with personalized print.', 'draft', 29.99, 8.50),
('prod_mens_tshirt_003', 'default_store', 'Custom Mens V-Neck T-Shirt', 'Stylish v-neck t-shirt with custom design.', 'draft', 29.99, 8.50),
('prod_mens_tshirt_004', 'default_store', 'Custom Mens Polo Shirt', 'Classic polo shirt with custom embroidery.', 'draft', 34.99, 12.00),
('prod_mens_tshirt_005', 'default_store', 'Custom Mens Henley Shirt', 'Comfortable henley with button collar design.', 'draft', 32.99, 10.00),
('prod_mens_tshirt_006', 'default_store', 'Custom Mens Graphic Tee', 'Bold graphic t-shirt with custom artwork.', 'draft', 27.99, 7.50),
('prod_mens_tshirt_007', 'default_store', 'Custom Mens Long Sleeve Tee', 'Long sleeve t-shirt with custom print.', 'draft', 32.99, 10.00),
('prod_mens_tshirt_008', 'default_store', 'Custom Mens Muscle Tee', 'Sleeveless muscle tee with custom design.', 'draft', 24.99, 6.50),
('prod_mens_tshirt_009', 'default_store', 'Custom Mens Pocket Tee', 'T-shirt with custom pocket design.', 'draft', 29.99, 8.00),
('prod_mens_tshirt_010', 'default_store', 'Custom Mens Striped Tee', 'Classic striped t-shirt with custom colors.', 'draft', 29.99, 8.50),
('prod_mens_tshirt_011', 'default_store', 'Custom Mens Color Block Tee', 'Modern color block t-shirt design.', 'draft', 31.99, 9.00),
('prod_mens_tshirt_012', 'default_store', 'Custom Mens Vintage Tee', 'Retro vintage style t-shirt.', 'draft', 34.99, 10.00),
('prod_mens_tshirt_013', 'default_store', 'Custom Mens Premium Cotton Tee', 'Ultra-soft premium cotton t-shirt.', 'draft', 34.99, 11.00),
('prod_mens_tshirt_014', 'default_store', 'Custom Mens Performance Tee', 'Moisture-wicking performance t-shirt.', 'draft', 34.99, 10.00),
('prod_mens_tshirt_015', 'default_store', 'Custom Mens Linen Tee', 'Breathable linen blend t-shirt.', 'draft', 39.99, 12.00),
('prod_mens_tshirt_016', 'default_store', 'Custom Mens Thermal Tee', 'Warm thermal long sleeve tee.', 'draft', 34.99, 10.00),
('prod_mens_tshirt_017', 'default_store', 'Custom Mens Rugby Shirt', 'Classic rugby style shirt.', 'draft', 44.99, 15.00),
('prod_mens_tshirt_018', 'default_store', 'Custom Mens Rugby Polo', 'Rugby polo with custom design.', 'draft', 39.99, 13.00),
('prod_mens_tshirt_019', 'default_store', 'Custom Mens Camp Collar Shirt', 'Relaxed camp collar shirt.', 'draft', 36.99, 12.00),
('prod_mens_tshirt_020', 'default_store', 'Custom Mens Oversized Tee', 'Trendy oversized t-shirt.', 'draft', 32.99, 9.00),
('prod_mens_tshirt_021', 'default_store', 'Custom Mens Cropped Tee', 'Modern cropped t-shirt for men.', 'draft', 27.99, 7.50),
('prod_mens_tshirt_022', 'default_store', 'Custom Mens Layering Tee', 'Perfect layering base tee.', 'draft', 24.99, 6.50),
('prod_mens_tshirt_023', 'default_store', 'Custom Mens Statement Tee', 'Bold statement graphic tee.', 'draft', 29.99, 8.00),
('prod_mens_tshirt_024', 'default_store', 'Custom Mens Minimalist Tee', 'Clean minimalist design tee.', 'draft', 27.99, 7.50),
('prod_mens_tshirt_025', 'default_store', 'Custom Mens Abstract Tee', 'Abstract art design tee.', 'draft', 31.99, 9.00),
('prod_mens_tshirt_026', 'default_store', 'Custom Mens Typography Tee', 'Typography-based design tee.', 'draft', 27.99, 7.50),
('prod_mens_tshirt_027', 'default_store', 'Custom Mens Nature Tee', 'Nature-inspired design tee.', 'draft', 29.99, 8.00),
('prod_mens_tshirt_028', 'default_store', 'Custom Mens Space Tee', 'Space and galaxy design tee.', 'draft', 31.99, 9.00),
('prod_mens_tshirt_029', 'default_store', 'Custom Mens Animal Tee', 'Animal print design tee.', 'draft', 29.99, 8.00),
('prod_mens_tshirt_030', 'default_store', 'Custom Mens Music Tee', 'Music-themed design tee.', 'draft', 29.99, 8.00),
('prod_mens_tshirt_031', 'default_store', 'Custom Mens Sports Tee', 'Sports-themed design tee.', 'draft', 29.99, 8.00),
('prod_mens_tshirt_032', 'default_store', 'Custom Mens Food Tee', 'Food-themed design tee.', 'draft', 27.99, 7.50),
('prod_mens_tshirt_033', 'default_store', 'Custom Mens Pop Culture Tee', 'Pop culture reference tee.', 'draft', 29.99, 8.00),
('prod_mens_tshirt_034', 'default_store', 'Custom Mens Retro 80s Tee', 'Retro 80s style tee.', 'draft', 31.99, 9.00),
('prod_mens_tshirt_035', 'default_store', 'Custom Mens Retro 90s Tee', 'Retro 90s style tee.', 'draft', 31.99, 9.00),
('prod_mens_tshirt_036', 'default_store', 'Custom Mens Vintage Wash Tee', 'Vintage wash effect tee.', 'draft', 34.99, 10.00),
('prod_mens_tshirt_037', 'default_store', 'Custom Mens Tie-Dye Tee', 'Hand-dyed tie-dye tee.', 'draft', 34.99, 10.00),
('prod_mens_tshirt_038', 'default_store', 'Custom Mens Camo Tee', 'Camo pattern design tee.', 'draft', 31.99, 9.00),
('prod_mens_tshirt_039', 'default_store', 'Custom Mens Plaid Tee', 'Classic plaid pattern tee.', 'draft', 31.99, 9.00),
('prod_mens_tshirt_040', 'default_store', 'Custom Mens Gradient Tee', 'Smooth gradient design tee.', 'draft', 29.99, 8.00),
('prod_mens_tshirt_041', 'default_store', 'Custom Mens Geometric Tee', 'Geometric pattern tee.', 'draft', 29.99, 8.00),
('prod_mens_tshirt_042', 'default_store', 'Custom Mens Floral Tee', 'Floral pattern tee.', 'draft', 31.99, 9.00),
('prod_mens_tshirt_043', 'default_store', 'Custom Mens Abstract Art Tee', 'Abstract art print tee.', 'draft', 32.99, 9.50),
('prod_mens_tshirt_044', 'default_store', 'Custom Mens Photo Print Tee', 'Photo-realistic print tee.', 'draft', 34.99, 10.00),
('prod_mens_tshirt_045', 'default_store', 'Custom Mens Sublimation Tee', 'Full sublimation print tee.', 'draft', 34.99, 10.00),
('prod_mens_tshirt_046', 'default_store', 'Custom Mens DTG Tee', 'Direct-to-garment printed tee.', 'draft', 32.99, 9.50)
ON CONFLICT (id) DO NOTHING;

-- Sweatshirts (34)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_mens_sweat_001', 'default_store', 'Custom Mens Pullover Sweatshirt', 'Warm fleece pullover with custom design.', 'draft', 49.99, 18.00),
('prod_mens_sweat_002', 'default_store', 'Custom Mens Zip-Up Sweatshirt', 'Premium zip-up with personalized print.', 'draft', 54.99, 20.00),
('prod_mens_sweat_003', 'default_store', 'Custom Mens Hoodie', 'Classic hoodie with custom design.', 'draft', 54.99, 20.00),
('prod_mens_sweat_004', 'default_store', 'Custom Mens Crewneck', 'Everyday crewneck with custom print.', 'draft', 49.99, 18.00),
('prod_mens_sweat_005', 'default_store', 'Custom Mens Oversized Hoodie', 'Trendy oversized hoodie.', 'draft', 59.99, 22.00),
('prod_mens_sweat_006', 'default_store', 'Custom Mens Cropped Hoodie', 'Modern cropped hoodie.', 'draft', 54.99, 20.00),
('prod_mens_sweat_007', 'default_store', 'Custom Mens Quarter-Zip', 'Quarter-zip pullover with custom design.', 'draft', 54.99, 20.00),
('prod_mens_sweat_008', 'default_store', 'Custom Mens Half-Zip', 'Half-zip fleece pullover.', 'draft', 52.99, 19.00),
('prod_mens_sweat_009', 'default_store', 'Custom Mens Heavyweight Hoodie', 'Premium heavyweight hoodie.', 'draft', 64.99, 25.00),
('prod_mens_sweat_010', 'default_store', 'Custom Mens Lightweight Hoodie', 'Lightweight layering hoodie.', 'draft', 44.99, 16.00),
('prod_mens_sweat_011', 'default_store', 'Custom Mens French Terry Crew', 'French terry crewneck sweatshirt.', 'draft', 47.99, 17.00),
('prod_mens_sweat_012', 'default_store', 'Custom Mens French Terry Pullover', 'French terry pullover.', 'draft', 47.99, 17.00),
('prod_mens_sweat_013', 'default_store', 'Custom Mens Fleece Hoodie', 'Soft fleece hoodie.', 'draft', 52.99, 19.00),
('prod_mens_sweat_014', 'default_store', 'Custom Mens Fleece Crew', 'Soft fleece crewneck.', 'draft', 49.99, 18.00),
('prod_mens_sweat_015', 'default_store', 'Custom Mens French Terry Hoodie', 'French terry hoodie.', 'draft', 52.99, 19.00),
('prod_mens_sweat_016', 'default_store', 'Custom Mens Terry Crewneck', 'Terry cloth crewneck.', 'draft', 44.99, 16.00),
('prod_mens_sweat_017', 'default_store', 'Custom Mens Terry Pullover', 'Terry cloth pullover.', 'draft', 44.99, 16.00),
('prod_mens_sweat_018', 'default_store', 'Custom Mens Terry Hoodie', 'Terry cloth hoodie.', 'draft', 49.99, 18.00),
('prod_mens_sweat_019', 'default_store', 'Custom Mens Loopback Crew', 'Loopback cotton crewneck.', 'draft', 52.99, 19.00),
('prod_mens_sweat_020', 'default_store', 'Custom Mens Loopback Hoodie', 'Loopback cotton hoodie.', 'draft', 54.99, 20.00),
('prod_mens_sweat_021', 'default_store', 'Custom Mens Waffle Crew', 'Thermal waffle crewneck.', 'draft', 47.99, 17.00),
('prod_mens_sweat_022', 'default_store', 'Custom Mens Waffle Hoodie', 'Thermal waffle hoodie.', 'draft', 52.99, 19.00),
('prod_mens_sweat_023', 'default_store', 'Custom Mens Sherpa Hoodie', 'Cozy sherpa lined hoodie.', 'draft', 64.99, 25.00),
('prod_mens_sweat_024', 'default_store', 'Custom Mens Sherpa Crew', 'Cozy sherpa lined crewneck.', 'draft', 59.99, 22.00),
('prod_mens_sweat_025', 'default_store', 'Custom Mens Boucle Hoodie', 'Textured boucle hoodie.', 'draft', 59.99, 22.00),
('prod_mens_sweat_026', 'default_store', 'Custom Mens Boucle Crew', 'Textured boucle crewneck.', 'draft', 54.99, 20.00),
('prod_mens_sweat_027', 'default_store', 'Custom Mens Velour Hoodie', 'Luxury velour hoodie.', 'draft', 59.99, 22.00),
('prod_mens_sweat_028', 'default_store', 'Custom Mens Velour Crew', 'Luxury velour crewneck.', 'draft', 54.99, 20.00),
('prod_mens_sweat_029', 'default_store', 'Custom Mens Nylon Hoodie', 'Lightweight nylon hoodie.', 'draft', 54.99, 20.00),
('prod_mens_sweat_030', 'default_store', 'Custom Mens Nylon Crew', 'Lightweight nylon crewneck.', 'draft', 49.99, 18.00),
('prod_mens_sweat_031', 'default_store', 'Custom Mens Tech Fleece Hoodie', 'Tech fleece performance hoodie.', 'draft', 69.99, 28.00),
('prod_mens_sweat_032', 'default_store', 'Custom Mens Tech Fleece Crew', 'Tech fleece performance crewneck.', 'draft', 64.99, 25.00),
('prod_mens_sweat_033', 'default_store', 'Custom Mens Polar Fleece Hoodie', 'Warm polar fleece hoodie.', 'draft', 52.99, 19.00),
('prod_mens_sweat_034', 'default_store', 'Custom Mens Polar Fleece Crew', 'Warm polar fleece crewneck.', 'draft', 49.99, 18.00)
ON CONFLICT (id) DO NOTHING;

-- Pajamas (12)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_mens_pajama_001', 'default_store', 'Custom Mens Pajama Set', 'Comfortable pajama set with custom design.', 'draft', 39.99, 15.00),
('prod_mens_pajama_002', 'default_store', 'Custom Mens Pajama Pants', 'Relaxed fit pajama pants.', 'draft', 24.99, 10.00),
('prod_mens_pajama_003', 'default_store', 'Custom Mens Pajama Top', 'Comfortable pajama top.', 'draft', 24.99, 10.00),
('prod_mens_pajama_004', 'default_store', 'Custom Mens Flannel Pajamas', 'Warm flannel pajama set.', 'draft', 44.99, 18.00),
('prod_mens_pajama_005', 'default_store', 'Custom Mens Flannel Pajama Pants', 'Warm flannel pajama pants.', 'draft', 29.99, 12.00),
('prod_mens_pajama_006', 'default_store', 'Custom Mens Flannel Pajama Top', 'Warm flannel pajama top.', 'draft', 29.99, 12.00),
('prod_mens_pajama_007', 'default_store', 'Custom Mens Silk Pajamas', 'Luxury silk pajama set.', 'draft', 69.99, 28.00),
('prod_mens_pajama_008', 'default_store', 'Custom Mens Silk Pajama Pants', 'Luxury silk pajama pants.', 'draft', 39.99, 16.00),
('prod_mens_pajama_009', 'default_store', 'Custom Mens Silk Pajama Top', 'Luxury silk pajama top.', 'draft', 39.99, 16.00),
('prod_mens_pajama_010', 'default_store', 'Custom Mens Cotton Pajamas', 'Soft cotton pajama set.', 'draft', 34.99, 14.00),
('prod_mens_pajama_011', 'default_store', 'Custom Mens Cotton Pajama Pants', 'Soft cotton pajama pants.', 'draft', 19.99, 8.00),
('prod_mens_pajama_012', 'default_store', 'Custom Mens Cotton Pajama Top', 'Soft cotton pajama top.', 'draft', 19.99, 8.00)
ON CONFLICT (id) DO NOTHING;

-- Pants (11)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_mens_pants_001', 'default_store', 'Custom Mens Cargo Pants', 'Durable cargo pants with custom design.', 'draft', 44.99, 16.00),
('prod_mens_pants_002', 'default_store', 'Custom Mens Chino Pants', 'Classic chino pants with custom print.', 'draft', 39.99, 14.00),
('prod_mens_pants_003', 'default_store', 'Custom Mens Jogger Pants', 'Comfortable jogger pants.', 'draft', 39.99, 14.00),
('prod_mens_pants_004', 'default_store', 'Custom Mens Sweatpants', 'Relaxed sweatpants with custom design.', 'draft', 34.99, 12.00),
('prod_mens_pants_005', 'default_store', 'Custom Mens Denim Jeans', 'Classic denim jeans with custom wash.', 'draft', 49.99, 18.00),
('prod_mens_pants_006', 'default_store', 'Custom Mens Dress Pants', 'Professional dress pants.', 'draft', 44.99, 16.00),
('prod_mens_pants_007', 'default_store', 'Custom Mens Track Pants', 'Athletic track pants.', 'draft', 34.99, 12.00),
('prod_mens_pants_008', 'default_store', 'Custom Mens Lounge Pants', 'Comfortable lounge pants.', 'draft', 29.99, 10.00),
('prod_mens_pants_009', 'default_store', 'Custom Mens Straight Leg Jeans', 'Classic straight leg jeans.', 'draft', 49.99, 18.00),
('prod_mens_pants_010', 'default_store', 'Custom Mens Slim Jeans', 'Modern slim fit jeans.', 'draft', 49.99, 18.00),
('prod_mens_pants_011', 'default_store', 'Custom Mens Relaxed Jeans', 'Relaxed fit jeans.', 'draft', 49.99, 18.00)
ON CONFLICT (id) DO NOTHING;

-- Underwear (4)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_mens_under_001', 'default_store', 'Custom Mens Boxer Briefs', 'Comfortable boxer briefs with custom design.', 'draft', 19.99, 5.00),
('prod_mens_under_002', 'default_store', 'Custom Mens Boxers', 'Classic boxers with custom print.', 'draft', 16.99, 4.50),
('prod_mens_under_003', 'default_store', 'Custom Mens Briefs', 'Classic briefs with custom design.', 'draft', 14.99, 4.00),
('prod_mens_under_004', 'default_store', 'Custom Mens Trunks', 'Modern trunks with custom print.', 'draft', 17.99, 5.00)
ON CONFLICT (id) DO NOTHING;

-- Women's Clothing (47)
-- T-shirts (16)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_womens_tshirt_001', 'default_store', 'Custom Womens Classic T-Shirt', 'Soft cotton t-shirt with custom design.', 'draft', 27.99, 8.00),
('prod_womens_tshirt_002', 'default_store', 'Custom Womens V-Neck Tee', 'Stylish v-neck with custom print.', 'draft', 27.99, 8.00),
('prod_womens_tshirt_003', 'default_store', 'Custom Womens Crop Top', 'Trendy crop top with custom design.', 'draft', 24.99, 7.00),
('prod_womens_tshirt_004', 'default_store', 'Custom Womens Graphic Tee', 'Bold graphic tee for women.', 'draft', 27.99, 7.50),
('prod_womens_tshirt_005', 'default_store', 'Custom Womens Fitted Tee', 'Fitted t-shirt with custom print.', 'draft', 27.99, 8.00),
('prod_womens_tshirt_006', 'default_store', 'Custom Womens Boxy Tee', 'Relaxed boxy fit tee.', 'draft', 27.99, 8.00),
('prod_womens_tshirt_007', 'default_store', 'Custom Womens Pocket Tee', 'T-shirt with custom pocket design.', 'draft', 27.99, 8.00),
('prod_womens_tshirt_008', 'default_store', 'Custom Womens Ribbed Tee', 'Ribbed texture tee.', 'draft', 29.99, 8.50),
('prod_womens_tshirt_009', 'default_store', 'Custom Womens Muscle Tee', 'Sleeveless muscle tee.', 'draft', 24.99, 6.50),
('prod_womens_tshirt_010', 'default_store', 'Custom Womens Long Sleeve Tee', 'Long sleeve tee with custom design.', 'draft', 32.99, 10.00),
('prod_womens_tshirt_011', 'default_store', 'Custom Womens Henley Tee', 'Henley style tee.', 'draft', 29.99, 8.50),
('prod_womens_tshirt_012', 'default_store', 'Custom Womens Striped Tee', 'Classic striped tee.', 'draft', 27.99, 8.00),
('prod_womens_tshirt_013', 'default_store', 'Custom Womens Color Block Tee', 'Color block design tee.', 'draft', 29.99, 8.50),
('prod_womens_tshirt_014', 'default_store', 'Custom Womens Vintage Tee', 'Retro vintage style tee.', 'draft', 29.99, 8.50),
('prod_womens_tshirt_015', 'default_store', 'Custom Womens Premium Cotton Tee', 'Ultra-soft premium cotton tee.', 'draft', 32.99, 10.00),
('prod_womens_tshirt_016', 'default_store', 'Custom Womens Linen Tee', 'Breathable linen blend tee.', 'draft', 34.99, 11.00)
ON CONFLICT (id) DO NOTHING;

-- Skirts (8)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_womens_skirt_001', 'default_store', 'Custom Womens Mini Skirt', 'Stylish mini skirt with custom pattern.', 'draft', 34.99, 12.00),
('prod_womens_skirt_002', 'default_store', 'Custom Womens Midi Skirt', 'Elegant midi skirt with custom design.', 'draft', 39.99, 14.00),
('prod_womens_skirt_003', 'default_store', 'Custom Womens Maxi Skirt', 'Flowing maxi skirt with custom print.', 'draft', 44.99, 16.00),
('prod_womens_skirt_004', 'default_store', 'Custom Womens Pleated Skirt', 'Classic pleated skirt.', 'draft', 39.99, 14.00),
('prod_womens_skirt_005', 'default_store', 'Custom Womens A-Line Skirt', 'Flattering A-line skirt.', 'draft', 39.99, 14.00),
('prod_womens_skirt_006', 'default_store', 'Custom Womens Pencil Skirt', 'Professional pencil skirt.', 'draft', 42.99, 15.00),
('prod_womens_skirt_007', 'default_store', 'Custom Womens Wrap Skirt', 'Versatile wrap skirt.', 'draft', 39.99, 14.00),
('prod_womens_skirt_008', 'default_store', 'Custom Womens Tiered Skirt', 'Trendy tiered skirt.', 'draft', 42.99, 15.00)
ON CONFLICT (id) DO NOTHING;

-- Swimwear (3)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_womens_swim_001', 'default_store', 'Custom Womens Bikini Set', 'Custom bikini set with unique design.', 'draft', 44.99, 15.00),
('prod_womens_swim_002', 'default_store', 'Custom Womens One-Piece Swimsuit', 'Elegant one-piece with custom print.', 'draft', 49.99, 18.00),
('prod_womens_swim_003', 'default_store', 'Custom Womens Swim Coverup', 'Stylish swim coverup with custom design.', 'draft', 34.99, 12.00)
ON CONFLICT (id) DO NOTHING;

-- Long-sleeved shirts (12)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_womens_long_001', 'default_store', 'Custom Womens Long Sleeve T-Shirt', 'Comfortable long sleeve tee with custom design.', 'draft', 32.99, 10.00),
('prod_womens_long_002', 'default_store', 'Custom Womens Flannel Shirt', 'Warm flannel shirt with custom pattern.', 'draft', 44.99, 16.00),
('prod_womens_long_003', 'default_store', 'Custom Womens Button-Down Shirt', 'Classic button-down with custom design.', 'draft', 39.99, 14.00),
('prod_womens_long_004', 'default_store', 'Custom Womens Chambray Shirt', 'Casual chambray shirt.', 'draft', 39.99, 14.00),
('prod_womens_long_005', 'default_store', 'Custom Womens Blouse', 'Elegant blouse with custom print.', 'draft', 42.99, 15.00),
('prod_womens_long_006', 'default_store', 'Custom Womens Peplum Top', 'Flattering peplum top.', 'draft', 44.99, 16.00),
('prod_womens_long_007', 'default_store', 'Custom Womens Wrap Top', 'Versatile wrap top.', 'draft', 39.99, 14.00),
('prod_womens_long_008', 'default_store', 'Custom Womens Tie-Front Top', 'Trendy tie-front top.', 'draft', 36.99, 13.00),
('prod_womens_long_009', 'default_store', 'Custom Womens Boat Neck Top', 'Classic boat neck top.', 'draft', 34.99, 12.00),
('prod_womens_long_010', 'default_store', 'Custom Womens Mock Neck Top', 'Elegant mock neck top.', 'draft', 36.99, 13.00),
('prod_womens_long_011', 'default_store', 'Custom Womens Turtleneck', 'Classic turtleneck top.', 'draft', 36.99, 13.00),
('prod_womens_long_012', 'default_store', 'Custom Womens Cowl Neck Top', 'Relaxed cowl neck top.', 'draft', 38.99, 14.00)
ON CONFLICT (id) DO NOTHING;

-- Bra and underwear (1)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_womens_bra_001', 'default_store', 'Custom Womens Bralette Set', 'Comfortable bralette set with custom design.', 'draft', 34.99, 12.00)
ON CONFLICT (id) DO NOTHING;

-- Pants (3)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_womens_pants_001', 'default_store', 'Custom Womens Leggings', 'Comfortable leggings with custom design.', 'draft', 34.99, 12.00),
('prod_womens_pants_002', 'default_store', 'Custom Womens Yoga Pants', 'Flexible yoga pants with custom print.', 'draft', 39.99, 14.00),
('prod_womens_pants_003', 'default_store', 'Custom Womens Palazzo Pants', 'Flowing palazzo pants.', 'draft', 42.99, 15.00)
ON CONFLICT (id) DO NOTHING;

-- Vests (2)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_womens_vest_001', 'default_store', 'Custom Womens Puffer Vest', 'Warm puffer vest with custom design.', 'draft', 44.99, 16.00),
('prod_womens_vest_002', 'default_store', 'Custom Womens Quilted Vest', 'Stylish quilted vest.', 'draft', 42.99, 15.00)
ON CONFLICT (id) DO NOTHING;

-- Pajamas (2)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_womens_pajama_001', 'default_store', 'Custom Womens Pajama Set', 'Comfortable pajama set with custom design.', 'draft', 39.99, 15.00),
('prod_womens_pajama_002', 'default_store', 'Custom Womens Robe', 'Luxurious robe with custom monogram.', 'draft', 54.99, 20.00)
ON CONFLICT (id) DO NOTHING;

-- Children's Clothing (18)
-- T-shirts (9)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_kids_tshirt_001', 'default_store', 'Custom Kids T-Shirt - Fun Print', 'Colorful t-shirt with fun custom design.', 'draft', 19.99, 6.00),
('prod_kids_tshirt_002', 'default_store', 'Custom Kids Long Sleeve Tee', 'Long sleeve tee with custom design.', 'draft', 22.99, 7.00),
('prod_kids_tshirt_003', 'default_store', 'Custom Kids Graphic Tee', 'Bold graphic tee for kids.', 'draft', 19.99, 6.00),
('prod_kids_tshirt_004', 'default_store', 'Custom Kids Colorful Tee', 'Vibrant colorful tee.', 'draft', 19.99, 6.00),
('prod_kids_tshirt_005', 'default_store', 'Custom Kids Animal Tee', 'Cute animal design tee.', 'draft', 19.99, 6.00),
('prod_kids_tshirt_006', 'default_store', 'Custom Kids Space Tee', 'Space adventure tee.', 'draft', 21.99, 7.00),
('prod_kids_tshirt_007', 'default_store', 'Custom Kids Dinosaur Tee', 'Dinosaur theme tee.', 'draft', 19.99, 6.00),
('prod_kids_tshirt_008', 'default_store', 'Custom Kids Unicorn Tee', 'Magical unicorn tee.', 'draft', 21.99, 7.00),
('prod_kids_tshirt_009', 'default_store', 'Custom Kids Rainbow Tee', 'Rainbow design tee.', 'draft', 19.99, 6.00)
ON CONFLICT (id) DO NOTHING;

-- Sweatshirts (7)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_kids_sweat_001', 'default_store', 'Custom Kids Hoodie', 'Cozy hoodie with fun design.', 'draft', 34.99, 12.00),
('prod_kids_sweat_002', 'default_store', 'Custom Kids Crewneck', 'Comfortable crewneck with custom print.', 'draft', 29.99, 10.00),
('prod_kids_sweat_003', 'default_store', 'Custom Kids Zip Hoodie', 'Zip-up hoodie with custom design.', 'draft', 37.99, 13.00),
('prod_kids_sweat_004', 'default_store', 'Custom Kids Pullover', 'Warm pullover sweatshirt.', 'draft', 32.99, 11.00),
('prod_kids_sweat_005', 'default_store', 'Custom Kids Fleece Hoodie', 'Soft fleece hoodie.', 'draft', 34.99, 12.00),
('prod_kids_sweat_006', 'default_store', 'Custom Kids Color Block Hoodie', 'Color block design hoodie.', 'draft', 36.99, 13.00),
('prod_kids_sweat_007', 'default_store', 'Custom Kids Striped Hoodie', 'Striped pattern hoodie.', 'draft', 34.99, 12.00)
ON CONFLICT (id) DO NOTHING;

-- Pants (1)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_kids_pants_001', 'default_store', 'Custom Kids Jogger Pants', 'Comfortable jogger pants for kids.', 'draft', 27.99, 9.00)
ON CONFLICT (id) DO NOTHING;

-- Underwear (1)
INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_kids_under_001', 'default_store', 'Custom Kids Underwear Set', 'Fun underwear set with custom design.', 'draft', 14.99, 4.50)
ON CONFLICT (id) DO NOTHING;

SELECT 'Clo clothing imported!' as result;
