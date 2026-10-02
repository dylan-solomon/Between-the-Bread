-- Wave 4: ingredients used by encyclopedia sandwiches that are not in the randomizer.
-- They are inserted disabled (enabled = false): they load with a sandwich but are never rolled.
-- Nutrition and cost values are draft estimates (standard serving sizes) and should be reviewed.
-- Safe to run more than once.

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'French Bread', 'french-bread', ARRAY['vegetarian', 'vegan', 'dairy_free', 'pescatarian']::text[], 'southern', '{"retail_low":0.5,"retail_high":1.5,"restaurant_low":1.5,"restaurant_high":4.5}'::jsonb, '{"calories":180,"protein_g":6,"fat_g":1,"carbs_g":35,"fiber_g":1,"sodium_mg":380,"sugar_g":2}'::jsonb, '/assets/ingredients/bread/french-bread.png', false, false
FROM categories WHERE slug = 'bread'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Muffuletta Bread', 'muffuletta-bread', ARRAY['vegetarian', 'vegan', 'dairy_free', 'pescatarian']::text[], 'italian', '{"retail_low":0.6,"retail_high":1.8,"restaurant_low":1.8,"restaurant_high":5.4}'::jsonb, '{"calories":200,"protein_g":7,"fat_g":3,"carbs_g":37,"fiber_g":2,"sodium_mg":380,"sugar_g":2}'::jsonb, '/assets/ingredients/bread/muffuletta-bread.png', false, false
FROM categories WHERE slug = 'bread'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Hot Dog Bun', 'hot-dog-bun', ARRAY['vegetarian', 'pescatarian']::text[], 'american', '{"retail_low":0.2,"retail_high":0.7,"restaurant_low":0.6,"restaurant_high":2.1}'::jsonb, '{"calories":120,"protein_g":4,"fat_g":2,"carbs_g":22,"fiber_g":1,"sodium_mg":210,"sugar_g":3}'::jsonb, '/assets/ingredients/bread/hot-dog-bun.png', false, false
FROM categories WHERE slug = 'bread'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Kummelweck Roll', 'kummelweck-roll', ARRAY['vegetarian', 'pescatarian']::text[], 'deli_classic', '{"retail_low":0.4,"retail_high":1.2,"restaurant_low":1.2,"restaurant_high":3.6}'::jsonb, '{"calories":180,"protein_g":6,"fat_g":2,"carbs_g":34,"fiber_g":1,"sodium_mg":600,"sugar_g":2}'::jsonb, '/assets/ingredients/bread/kummelweck-roll.png', false, false
FROM categories WHERE slug = 'bread'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Fried Shrimp', 'fried-shrimp', ARRAY['pescatarian', 'contains_shellfish']::text[], 'southern', '{"retail_low":2.0,"retail_high":4.5,"restaurant_low":6.0,"restaurant_high":13.5}'::jsonb, '{"calories":200,"protein_g":12,"fat_g":10,"carbs_g":14,"fiber_g":1,"sodium_mg":450,"sugar_g":1}'::jsonb, '/assets/ingredients/protein/fried-shrimp.png', false, false
FROM categories WHERE slug = 'protein'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Lobster', 'lobster', ARRAY['pescatarian', 'dairy_free', 'gluten_free', 'contains_shellfish']::text[], 'neutral', '{"retail_low":6.0,"retail_high":12.0,"restaurant_low":18.0,"restaurant_high":36.0}'::jsonb, '{"calories":90,"protein_g":19,"fat_g":1,"carbs_g":0,"fiber_g":0,"sodium_mg":380,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/lobster.png', false, false
FROM categories WHERE slug = 'protein'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Bologna', 'bologna', ARRAY['contains_pork']::text[], 'american', '{"retail_low":0.4,"retail_high":1.2,"restaurant_low":1.2,"restaurant_high":3.6}'::jsonb, '{"calories":180,"protein_g":7,"fat_g":16,"carbs_g":2,"fiber_g":0,"sodium_mg":600,"sugar_g":1}'::jsonb, '/assets/ingredients/protein/bologna.png', false, false
FROM categories WHERE slug = 'protein'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Breaded Pork Tenderloin', 'breaded-pork-tenderloin', ARRAY['dairy_free', 'contains_pork']::text[], 'american', '{"retail_low":1.5,"retail_high":3.5,"restaurant_low":4.5,"restaurant_high":10.5}'::jsonb, '{"calories":300,"protein_g":22,"fat_g":15,"carbs_g":18,"fiber_g":1,"sodium_mg":500,"sugar_g":1}'::jsonb, '/assets/ingredients/protein/breaded-pork-tenderloin.png', false, false
FROM categories WHERE slug = 'protein'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Cheese Sauce', 'cheese-sauce', ARRAY['vegetarian', 'pescatarian']::text[], 'american', '{"retail_low":0.3,"retail_high":0.9,"restaurant_low":0.9,"restaurant_high":2.7}'::jsonb, '{"calories":90,"protein_g":4,"fat_g":7,"carbs_g":3,"fiber_g":0,"sodium_mg":300,"sugar_g":1}'::jsonb, '/assets/ingredients/cheese/cheese-sauce.png', false, false
FROM categories WHERE slug = 'cheese'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Olive Salad', 'olive-salad', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'italian', '{"retail_low":0.5,"retail_high":1.5,"restaurant_low":1.5,"restaurant_high":4.5}'::jsonb, '{"calories":80,"protein_g":0,"fat_g":8,"carbs_g":2,"fiber_g":1,"sodium_mg":400,"sugar_g":0}'::jsonb, '/assets/ingredients/toppings/olive-salad.png', false, false
FROM categories WHERE slug = 'toppings'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Giardiniera', 'giardiniera', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'italian', '{"retail_low":0.3,"retail_high":0.9,"restaurant_low":0.9,"restaurant_high":2.7}'::jsonb, '{"calories":40,"protein_g":0,"fat_g":4,"carbs_g":1,"fiber_g":1,"sodium_mg":300,"sugar_g":0}'::jsonb, '/assets/ingredients/toppings/giardiniera.png', false, false
FROM categories WHERE slug = 'toppings'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Pimentos', 'pimentos', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'southern', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":5,"protein_g":0,"fat_g":0,"carbs_g":1,"fiber_g":0,"sodium_mg":2,"sugar_g":1}'::jsonb, '/assets/ingredients/toppings/pimentos.png', false, false
FROM categories WHERE slug = 'toppings'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Banana', 'banana', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'american', '{"retail_low":0.15,"retail_high":0.4,"restaurant_low":0.45,"restaurant_high":1.2}'::jsonb, '{"calories":105,"protein_g":1,"fat_g":0,"carbs_g":27,"fiber_g":3,"sodium_mg":1,"sugar_g":14}'::jsonb, '/assets/ingredients/toppings/banana.png', false, false
FROM categories WHERE slug = 'toppings'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'French Fries', 'french-fries', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free']::text[], 'american', '{"retail_low":0.4,"retail_high":1.2,"restaurant_low":1.2,"restaurant_high":3.6}'::jsonb, '{"calories":230,"protein_g":3,"fat_g":11,"carbs_g":30,"fiber_g":3,"sodium_mg":160,"sugar_g":0}'::jsonb, '/assets/ingredients/toppings/french-fries.png', false, false
FROM categories WHERE slug = 'toppings'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Mornay Sauce', 'mornay-sauce', ARRAY['vegetarian', 'pescatarian']::text[], 'neutral', '{"retail_low":0.2,"retail_high":0.8,"restaurant_low":0.6,"restaurant_high":2.4}'::jsonb, '{"calories":60,"protein_g":3,"fat_g":4,"carbs_g":3,"fiber_g":0,"sodium_mg":150,"sugar_g":1}'::jsonb, '/assets/ingredients/condiments/mornay-sauce.png', false, false
FROM categories WHERE slug = 'condiments'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Cayenne Paste', 'cayenne-paste', ARRAY['dairy_free', 'gluten_free', 'contains_pork']::text[], 'southern', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":80,"protein_g":0,"fat_g":8,"carbs_g":2,"fiber_g":1,"sodium_mg":150,"sugar_g":0}'::jsonb, '/assets/ingredients/condiments/cayenne-paste.png', false, false
FROM categories WHERE slug = 'condiments'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Marshmallow Creme', 'marshmallow-creme', ARRAY['vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'american', '{"retail_low":0.1,"retail_high":0.3,"restaurant_low":0.3,"restaurant_high":0.9}'::jsonb, '{"calories":40,"protein_g":0,"fat_g":0,"carbs_g":10,"fiber_g":0,"sodium_mg":10,"sugar_g":6}'::jsonb, '/assets/ingredients/condiments/marshmallow-creme.png', false, false
FROM categories WHERE slug = 'condiments'
ON CONFLICT (category_id, slug) DO NOTHING;
