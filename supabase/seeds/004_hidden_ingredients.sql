-- Ingredients used by encyclopedia sandwiches that are not in the randomizer.
-- They are inserted disabled (enabled = false): they load with a sandwich but are never rolled.
-- Nutrition and cost values are draft estimates (standard serving sizes) and should be reviewed.
-- Safe to run more than once.

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Pain de mie', 'pain-de-mie', ARRAY['vegetarian', 'pescatarian']::text[], 'neutral', '{"retail_low":0.35,"retail_high":1.2,"restaurant_low":1.05,"restaurant_high":3.6}'::jsonb, '{"calories":130,"protein_g":4,"fat_g":2,"carbs_g":24,"fiber_g":1,"sodium_mg":240,"sugar_g":3}'::jsonb, '/assets/ingredients/bread/pain-de-mie.png', false, false
FROM categories WHERE slug = 'bread'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Cuban bread', 'cuban-bread', ARRAY['dairy_free', 'contains_pork']::text[], 'neutral', '{"retail_low":0.3,"retail_high":1.3,"restaurant_low":0.9,"restaurant_high":3.9}'::jsonb, '{"calories":140,"protein_g":5,"fat_g":2,"carbs_g":27,"fiber_g":1,"sodium_mg":290,"sugar_g":1}'::jsonb, '/assets/ingredients/bread/cuban-bread.png', false, false
FROM categories WHERE slug = 'bread'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Ground beef patty', 'ground-beef-patty', ARRAY['dairy_free', 'gluten_free']::text[], 'american', '{"retail_low":0.8,"retail_high":2.0,"restaurant_low":2.4,"restaurant_high":6.0}'::jsonb, '{"calories":150,"protein_g":14,"fat_g":10,"carbs_g":0,"fiber_g":0,"sodium_mg":60,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/ground-beef-patty.png', false, false
FROM categories WHERE slug = 'protein'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Roast pork', 'roast-pork', ARRAY['dairy_free', 'gluten_free', 'contains_pork']::text[], 'southern', '{"retail_low":0.8,"retail_high":2.0,"restaurant_low":2.4,"restaurant_high":6.0}'::jsonb, '{"calories":110,"protein_g":16,"fat_g":5,"carbs_g":0,"fiber_g":0,"sodium_mg":75,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/roast-pork.png', false, false
FROM categories WHERE slug = 'protein'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Poached Egg', 'poached-egg', ARRAY['vegetarian', 'gluten_free', 'dairy_free', 'pescatarian']::text[], 'american', '{"retail_low":0.25,"retail_high":0.6,"restaurant_low":0.75,"restaurant_high":1.8}'::jsonb, '{"calories":72,"protein_g":6,"fat_g":5,"carbs_g":0,"fiber_g":0,"sodium_mg":140,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/poached-egg.png', false, false
FROM categories WHERE slug = 'protein'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'American', 'american-cheese', ARRAY['vegetarian', 'gluten_free', 'pescatarian']::text[], 'american', '{"retail_low":0.25,"retail_high":0.8,"restaurant_low":0.75,"restaurant_high":2.4}'::jsonb, '{"calories":94,"protein_g":5,"fat_g":7,"carbs_g":1,"fiber_g":0,"sodium_mg":330,"sugar_g":1}'::jsonb, '/assets/ingredients/cheese/american-cheese.png', false, false
FROM categories WHERE slug = 'cheese'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Emmental', 'emmental', ARRAY['vegetarian', 'gluten_free', 'pescatarian']::text[], 'deli_classic', '{"retail_low":0.5,"retail_high":1.5,"restaurant_low":1.5,"restaurant_high":4.5}'::jsonb, '{"calories":105,"protein_g":8,"fat_g":8,"carbs_g":0,"fiber_g":0,"sodium_mg":55,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/emmental.png', false, false
FROM categories WHERE slug = 'cheese'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Comté', 'comte', ARRAY['vegetarian', 'gluten_free', 'pescatarian']::text[], 'neutral', '{"retail_low":0.7,"retail_high":2.0,"restaurant_low":2.1,"restaurant_high":6.0}'::jsonb, '{"calories":112,"protein_g":8,"fat_g":9,"carbs_g":0,"fiber_g":0,"sodium_mg":120,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/comte.png', false, false
FROM categories WHERE slug = 'cheese'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Butter', 'butter', ARRAY['vegetarian', 'gluten_free', 'pescatarian']::text[], 'neutral', '{"retail_low":0.05,"retail_high":0.2,"restaurant_low":0.15,"restaurant_high":0.6}'::jsonb, '{"calories":100,"protein_g":0,"fat_g":11,"carbs_g":0,"fiber_g":0,"sodium_mg":80,"sugar_g":0}'::jsonb, '/assets/ingredients/condiments/butter.png', false, false
FROM categories WHERE slug = 'condiments'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Béchamel', 'bechamel', ARRAY['vegetarian', 'pescatarian']::text[], 'neutral', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":25,"protein_g":1,"fat_g":2,"carbs_g":2,"fiber_g":0,"sodium_mg":40,"sugar_g":1}'::jsonb, '/assets/ingredients/condiments/bechamel.png', false, false
FROM categories WHERE slug = 'condiments'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Thousand Island', 'thousand-island', ARRAY['vegetarian', 'gluten_free', 'pescatarian']::text[], 'american', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":59,"protein_g":0,"fat_g":6,"carbs_g":2,"fiber_g":0,"sodium_mg":134,"sugar_g":2}'::jsonb, '/assets/ingredients/condiments/thousand-island.png', false, false
FROM categories WHERE slug = 'condiments'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Powdered sugar', 'powdered-sugar', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'american', '{"retail_low":0.03,"retail_high":0.1,"restaurant_low":0.09,"restaurant_high":0.3}'::jsonb, '{"calories":58,"protein_g":0,"fat_g":0,"carbs_g":15,"fiber_g":0,"sodium_mg":0,"sugar_g":15}'::jsonb, '/assets/ingredients/condiments/powdered-sugar.png', false, false
FROM categories WHERE slug = 'condiments'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Maple syrup', 'maple-syrup', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'american', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":39,"protein_g":0,"fat_g":0,"carbs_g":10,"fiber_g":0,"sodium_mg":2,"sugar_g":9}'::jsonb, '/assets/ingredients/condiments/maple-syrup.png', false, false
FROM categories WHERE slug = 'condiments'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Jam', 'jam', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'american', '{"retail_low":0.08,"retail_high":0.3,"restaurant_low":0.24,"restaurant_high":0.9}'::jsonb, '{"calories":42,"protein_g":0,"fat_g":0,"carbs_g":10,"fiber_g":0,"sodium_mg":2,"sugar_g":7}'::jsonb, '/assets/ingredients/condiments/jam.png', false, false
FROM categories WHERE slug = 'condiments'
ON CONFLICT (category_id, slug) DO NOTHING;
