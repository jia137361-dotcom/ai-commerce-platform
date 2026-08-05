-- Import additional products

INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_mens_ext_001', 'default_store', 'Custom Mens Thermal Shirt', 'Warm thermal long sleeve shirt.', 'draft', 34.99, 10.00),
('prod_mens_ext_002', 'default_store', 'Custom Mens Rugby Shirt', 'Classic rugby style shirt.', 'draft', 44.99, 15.00),
('prod_mens_ext_003', 'default_store', 'Custom Mens Camp Collar Shirt', 'Relaxed camp collar shirt.', 'draft', 36.99, 12.00),
('prod_mens_ext_004', 'default_store', 'Custom Mens Oversized Tee', 'Trendy oversized t-shirt.', 'draft', 32.99, 9.00),
('prod_mens_ext_005', 'default_store', 'Custom Mens Cropped Tee', 'Modern cropped t-shirt.', 'draft', 27.99, 7.50),
('prod_mens_ext_006', 'default_store', 'Custom Mens Layering Tee', 'Perfect layering base tee.', 'draft', 24.99, 6.50),
('prod_mens_ext_007', 'default_store', 'Custom Mens Statement Tee', 'Bold statement graphic tee.', 'draft', 29.99, 8.00),
('prod_mens_ext_008', 'default_store', 'Custom Mens Minimalist Tee', 'Clean minimalist design tee.', 'draft', 27.99, 7.50),
('prod_mens_ext_009', 'default_store', 'Custom Mens Abstract Tee', 'Abstract art design tee.', 'draft', 31.99, 9.00),
('prod_mens_ext_010', 'default_store', 'Custom Mens Typography Tee', 'Typography-based design tee.', 'draft', 27.99, 7.50),
('prod_mens_ext_011', 'default_store', 'Custom Mens Nature Tee', 'Nature-inspired design tee.', 'draft', 29.99, 8.00),
('prod_mens_ext_012', 'default_store', 'Custom Mens Space Tee', 'Space and galaxy design tee.', 'draft', 31.99, 9.00),
('prod_mens_ext_013', 'default_store', 'Custom Mens Animal Tee', 'Animal print design tee.', 'draft', 29.99, 8.00),
('prod_mens_ext_014', 'default_store', 'Custom Mens Music Tee', 'Music-themed design tee.', 'draft', 29.99, 8.00),
('prod_mens_ext_015', 'default_store', 'Custom Mens Sports Tee', 'Sports-themed design tee.', 'draft', 29.99, 8.00),
('prod_mens_ext_016', 'default_store', 'Custom Mens Food Tee', 'Food-themed design tee.', 'draft', 27.99, 7.50),
('prod_mens_ext_017', 'default_store', 'Custom Mens Pop Culture Tee', 'Pop culture reference tee.', 'draft', 29.99, 8.00),
('prod_mens_ext_018', 'default_store', 'Custom Mens Retro 80s Tee', 'Retro 80s style tee.', 'draft', 31.99, 9.00),
('prod_mens_ext_019', 'default_store', 'Custom Mens Retro 90s Tee', 'Retro 90s style tee.', 'draft', 31.99, 9.00),
('prod_mens_ext_020', 'default_store', 'Custom Mens Vintage Wash Tee', 'Vintage wash effect tee.', 'draft', 34.99, 10.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_mens_sweat_ext_001', 'default_store', 'Custom Mens Lightweight Hoodie', 'Lightweight layering hoodie.', 'draft', 44.99, 16.00),
('prod_mens_sweat_ext_002', 'default_store', 'Custom Mens French Terry Crew', 'French terry crewneck sweatshirt.', 'draft', 47.99, 17.00),
('prod_mens_sweat_ext_003', 'default_store', 'Custom Mens Fleece Hoodie', 'Soft fleece hoodie.', 'draft', 52.99, 19.00),
('prod_mens_sweat_ext_004', 'default_store', 'Custom Mens Sherpa Hoodie', 'Cozy sherpa lined hoodie.', 'draft', 64.99, 25.00),
('prod_mens_sweat_ext_005', 'default_store', 'Custom Mens Boucle Hoodie', 'Textured boucle hoodie.', 'draft', 59.99, 22.00),
('prod_mens_sweat_ext_006', 'default_store', 'Custom Mens Velour Hoodie', 'Luxury velour hoodie.', 'draft', 59.99, 22.00),
('prod_mens_sweat_ext_007', 'default_store', 'Custom Mens Nylon Hoodie', 'Lightweight nylon hoodie.', 'draft', 54.99, 20.00),
('prod_mens_sweat_ext_008', 'default_store', 'Custom Mens Tech Fleece Hoodie', 'Tech fleece performance hoodie.', 'draft', 69.99, 28.00),
('prod_mens_sweat_ext_009', 'default_store', 'Custom Mens Polar Fleece Hoodie', 'Warm polar fleece hoodie.', 'draft', 52.99, 19.00),
('prod_mens_sweat_ext_010', 'default_store', 'Custom Mens Waffle Hoodie', 'Thermal waffle hoodie.', 'draft', 52.99, 19.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_decor_ext_001', 'default_store', 'Custom LED Neon Sign', 'Custom LED neon sign with text.', 'draft', 79.99, 30.00),
('prod_decor_ext_002', 'default_store', 'Custom 3D Wall Panel', 'Textured 3D wall panel.', 'draft', 49.99, 18.00),
('prod_decor_ext_003', 'default_store', 'Custom Canvas Photo Print', 'Photo printed on canvas.', 'draft', 39.99, 14.00),
('prod_decor_ext_004', 'default_store', 'Custom Metal Letter Sign', 'Individual metal letters.', 'draft', 12.99, 3.50),
('prod_decor_ext_005', 'default_store', 'Custom Wooden Sign', 'Rustic wooden sign with text.', 'draft', 34.99, 12.00),
('prod_decor_ext_006', 'default_store', 'Custom Glass Art', 'Stained glass style art.', 'draft', 59.99, 22.00),
('prod_decor_ext_007', 'default_store', 'Custom Resin Art', 'Epoxy resin art piece.', 'draft', 69.99, 25.00),
('prod_decor_ext_008', 'default_store', 'Custom Abstract Wall Art', 'Modern abstract art.', 'draft', 54.99, 20.00),
('prod_decor_ext_009', 'default_store', 'Custom Botanical Print', 'Botanical illustration print.', 'draft', 29.99, 10.00),
('prod_decor_ext_010', 'default_store', 'Custom Geometric Wall Art', 'Geometric pattern wall decor.', 'draft', 44.99, 16.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO mc_product (id, store_id, title, description, status, price, cost) VALUES
('prod_digital_ext_001', 'default_store', 'Custom AirPods Case', 'Protective case for AirPods.', 'draft', 14.99, 4.00),
('prod_digital_ext_002', 'default_store', 'Custom Apple Watch Band', 'Custom watch band for Apple Watch.', 'draft', 24.99, 8.00),
('prod_digital_ext_003', 'default_store', 'Custom Phone Grip', 'Pop socket style phone grip.', 'draft', 12.99, 3.50),
('prod_digital_ext_004', 'default_store', 'Custom Cable Organizer', 'Cable management organizer.', 'draft', 9.99, 2.50),
('prod_digital_ext_005', 'default_store', 'Custom Screen Cleaner', 'Microfiber screen cleaner cloth.', 'draft', 7.99, 2.00),
('prod_digital_ext_006', 'default_store', 'Custom Laptop Sticker', 'Vinyl laptop sticker.', 'draft', 6.99, 1.50),
('prod_digital_ext_007', 'default_store', 'Custom Tablet Stand', 'Adjustable tablet stand.', 'draft', 19.99, 6.00),
('prod_digital_ext_008', 'default_store', 'Custom Wireless Charger', 'Qi wireless charger pad.', 'draft', 29.99, 10.00),
('prod_digital_ext_009', 'default_store', 'Custom Phone Ring Holder', 'Metal phone ring holder.', 'draft', 9.99, 2.50),
('prod_digital_ext_010', 'default_store', 'Custom Laptop Stand', 'Ergonomic laptop stand.', 'draft', 34.99, 12.00)
ON CONFLICT (id) DO NOTHING;

SELECT 'Import complete! Total: ' || count(*) || ' products' as result FROM mc_product;
