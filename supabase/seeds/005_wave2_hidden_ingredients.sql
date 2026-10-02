-- Wave 2: ingredients used by encyclopedia sandwiches that are not in the randomizer.
-- They are inserted disabled (enabled = false): they load with a sandwich but are never rolled.
-- Nutrition and cost values are draft estimates (standard serving sizes) and should be reviewed.
-- Safe to run more than once.

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Hoagie Roll', 'hoagie-roll', ARRAY['vegetarian', 'vegan', 'dairy_free', 'pescatarian']::text[], 'italian', '{"retail_low":0.5,"retail_high":1.5,"restaurant_low":1.5,"restaurant_high":4.5}'::jsonb, '{"calories":200,"protein_g":7,"fat_g":3,"carbs_g":38,"fiber_g":2,"sodium_mg":400,"sugar_g":3}'::jsonb, '/assets/ingredients/bread/hoagie-roll.png', false, false
FROM categories WHERE slug = 'bread'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'French Roll', 'french-roll', ARRAY['vegetarian', 'vegan', 'dairy_free', 'pescatarian']::text[], 'neutral', '{"retail_low":0.4,"retail_high":1.3,"restaurant_low":1.2,"restaurant_high":3.9}'::jsonb, '{"calories":150,"protein_g":5,"fat_g":1,"carbs_g":29,"fiber_g":1,"sodium_mg":320,"sugar_g":2}'::jsonb, '/assets/ingredients/bread/french-roll.png', false, false
FROM categories WHERE slug = 'bread'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Hamburger Bun', 'hamburger-bun', ARRAY['vegetarian', 'pescatarian']::text[], 'american', '{"retail_low":0.25,"retail_high":0.8,"restaurant_low":0.75,"restaurant_high":2.4}'::jsonb, '{"calories":140,"protein_g":4,"fat_g":2,"carbs_g":26,"fiber_g":1,"sodium_mg":220,"sugar_g":4}'::jsonb, '/assets/ingredients/bread/hamburger-bun.png', false, false
FROM categories WHERE slug = 'bread'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Kaiser Roll', 'kaiser-roll', ARRAY['vegetarian', 'pescatarian']::text[], 'deli_classic', '{"retail_low":0.35,"retail_high":1.0,"restaurant_low":1.05,"restaurant_high":3.0}'::jsonb, '{"calories":170,"protein_g":6,"fat_g":2,"carbs_g":32,"fiber_g":1,"sodium_mg":310,"sugar_g":1}'::jsonb, '/assets/ingredients/bread/kaiser-roll.png', false, false
FROM categories WHERE slug = 'bread'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Peanut Butter', 'peanut-butter', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free', 'contains_peanuts']::text[], 'american', '{"retail_low":0.15,"retail_high":0.5,"restaurant_low":0.45,"restaurant_high":1.5}'::jsonb, '{"calories":190,"protein_g":7,"fat_g":16,"carbs_g":7,"fiber_g":2,"sodium_mg":140,"sugar_g":3}'::jsonb, '/assets/ingredients/protein/peanut-butter.png', false, false
FROM categories WHERE slug = 'protein'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Ground Beef', 'ground-beef', ARRAY['dairy_free', 'gluten_free']::text[], 'american', '{"retail_low":0.8,"retail_high":2.0,"restaurant_low":2.4,"restaurant_high":6.0}'::jsonb, '{"calories":150,"protein_g":14,"fat_g":10,"carbs_g":0,"fiber_g":0,"sodium_mg":50,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/ground-beef.png', false, false
FROM categories WHERE slug = 'protein'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Steak', 'steak', ARRAY['dairy_free', 'gluten_free']::text[], 'american', '{"retail_low":1.5,"retail_high":3.5,"restaurant_low":4.5,"restaurant_high":10.5}'::jsonb, '{"calories":170,"protein_g":14,"fat_g":12,"carbs_g":0,"fiber_g":0,"sodium_mg":40,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/steak.png', false, false
FROM categories WHERE slug = 'protein'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Meatballs', 'meatballs', ARRAY['contains_pork']::text[], 'italian', '{"retail_low":1.0,"retail_high":2.5,"restaurant_low":3.0,"restaurant_high":7.5}'::jsonb, '{"calories":240,"protein_g":14,"fat_g":16,"carbs_g":8,"fiber_g":1,"sodium_mg":500,"sugar_g":2}'::jsonb, '/assets/ingredients/protein/meatballs.png', false, false
FROM categories WHERE slug = 'protein'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Fried Chicken', 'fried-chicken', ARRAY[]::text[], 'southern', '{"retail_low":1.0,"retail_high":2.5,"restaurant_low":3.0,"restaurant_high":7.5}'::jsonb, '{"calories":260,"protein_g":20,"fat_g":13,"carbs_g":15,"fiber_g":1,"sodium_mg":560,"sugar_g":1}'::jsonb, '/assets/ingredients/protein/fried-chicken.png', false, false
FROM categories WHERE slug = 'protein'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Chicken Salad', 'chicken-salad', ARRAY['dairy_free', 'gluten_free']::text[], 'american', '{"retail_low":0.8,"retail_high":2.0,"restaurant_low":2.4,"restaurant_high":6.0}'::jsonb, '{"calories":150,"protein_g":12,"fat_g":11,"carbs_g":1,"fiber_g":0,"sodium_mg":250,"sugar_g":1}'::jsonb, '/assets/ingredients/protein/chicken-salad.png', false, false
FROM categories WHERE slug = 'protein'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Smoked Brisket', 'smoked-brisket', ARRAY['dairy_free', 'gluten_free']::text[], 'southern', '{"retail_low":1.5,"retail_high":3.5,"restaurant_low":4.5,"restaurant_high":10.5}'::jsonb, '{"calories":160,"protein_g":14,"fat_g":11,"carbs_g":0,"fiber_g":0,"sodium_mg":300,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/smoked-brisket.png', false, false
FROM categories WHERE slug = 'protein'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Parmesan', 'parmesan', ARRAY['gluten_free', 'pescatarian']::text[], 'italian', '{"retail_low":0.3,"retail_high":0.9,"restaurant_low":0.9,"restaurant_high":2.7}'::jsonb, '{"calories":42,"protein_g":4,"fat_g":3,"carbs_g":0,"fiber_g":0,"sodium_mg":150,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/parmesan.png', false, false
FROM categories WHERE slug = 'cheese'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Fresh Mozzarella', 'fresh-mozzarella', ARRAY['vegetarian', 'gluten_free', 'pescatarian']::text[], 'italian', '{"retail_low":0.5,"retail_high":1.5,"restaurant_low":1.5,"restaurant_high":4.5}'::jsonb, '{"calories":70,"protein_g":5,"fat_g":5,"carbs_g":1,"fiber_g":0,"sodium_mg":85,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/fresh-mozzarella.png', false, false
FROM categories WHERE slug = 'cheese'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Sautéed Onions', 'sauteed-onions', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'neutral', '{"retail_low":0.15,"retail_high":0.5,"restaurant_low":0.45,"restaurant_high":1.5}'::jsonb, '{"calories":25,"protein_g":0,"fat_g":1,"carbs_g":4,"fiber_g":1,"sodium_mg":3,"sugar_g":2}'::jsonb, '/assets/ingredients/toppings/sauteed-onions.png', false, false
FROM categories WHERE slug = 'toppings'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Hot Peppers', 'hot-peppers', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'italian', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":5,"protein_g":0,"fat_g":0,"carbs_g":1,"fiber_g":0,"sodium_mg":150,"sugar_g":0}'::jsonb, '/assets/ingredients/toppings/hot-peppers.png', false, false
FROM categories WHERE slug = 'toppings'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Celery', 'celery', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'neutral', '{"retail_low":0.05,"retail_high":0.2,"restaurant_low":0.15,"restaurant_high":0.6}'::jsonb, '{"calories":3,"protein_g":0,"fat_g":0,"carbs_g":1,"fiber_g":0,"sodium_mg":16,"sugar_g":0}'::jsonb, '/assets/ingredients/toppings/celery.png', false, false
FROM categories WHERE slug = 'toppings'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Basil', 'basil', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'italian', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":1,"protein_g":0,"fat_g":0,"carbs_g":0,"fiber_g":0,"sodium_mg":0,"sugar_g":0}'::jsonb, '/assets/ingredients/toppings/basil.png', false, false
FROM categories WHERE slug = 'toppings'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Green Pepper', 'green-pepper', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'neutral', '{"retail_low":0.1,"retail_high":0.3,"restaurant_low":0.3,"restaurant_high":0.9}'::jsonb, '{"calories":5,"protein_g":0,"fat_g":0,"carbs_g":1,"fiber_g":0,"sodium_mg":1,"sugar_g":1}'::jsonb, '/assets/ingredients/toppings/green-pepper.png', false, false
FROM categories WHERE slug = 'toppings'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Onion', 'onion', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'neutral', '{"retail_low":0.05,"retail_high":0.2,"restaurant_low":0.15,"restaurant_high":0.6}'::jsonb, '{"calories":12,"protein_g":0,"fat_g":0,"carbs_g":3,"fiber_g":0,"sodium_mg":1,"sugar_g":1}'::jsonb, '/assets/ingredients/toppings/onion.png', false, false
FROM categories WHERE slug = 'toppings'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Jelly', 'jelly', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'american', '{"retail_low":0.05,"retail_high":0.25,"restaurant_low":0.15,"restaurant_high":0.75}'::jsonb, '{"calories":50,"protein_g":0,"fat_g":0,"carbs_g":13,"fiber_g":0,"sodium_mg":5,"sugar_g":10}'::jsonb, '/assets/ingredients/condiments/jelly.png', false, false
FROM categories WHERE slug = 'condiments'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Spicy Brown Mustard', 'spicy-brown-mustard', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'deli_classic', '{"retail_low":0.03,"retail_high":0.15,"restaurant_low":0.09,"restaurant_high":0.45}'::jsonb, '{"calories":5,"protein_g":0,"fat_g":0,"carbs_g":0,"fiber_g":0,"sodium_mg":100,"sugar_g":0}'::jsonb, '/assets/ingredients/condiments/spicy-brown-mustard.png', false, false
FROM categories WHERE slug = 'condiments'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Ketchup', 'ketchup', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'american', '{"retail_low":0.02,"retail_high":0.1,"restaurant_low":0.06,"restaurant_high":0.3}'::jsonb, '{"calories":20,"protein_g":0,"fat_g":0,"carbs_g":5,"fiber_g":0,"sodium_mg":160,"sugar_g":4}'::jsonb, '/assets/ingredients/condiments/ketchup.png', false, false
FROM categories WHERE slug = 'condiments'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Marinara Sauce', 'marinara-sauce', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'italian', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":35,"protein_g":1,"fat_g":1,"carbs_g":5,"fiber_g":1,"sodium_mg":300,"sugar_g":3}'::jsonb, '/assets/ingredients/condiments/marinara-sauce.png', false, false
FROM categories WHERE slug = 'condiments'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Au Jus', 'au-jus', ARRAY['dairy_free']::text[], 'deli_classic', '{"retail_low":0.1,"retail_high":0.5,"restaurant_low":0.3,"restaurant_high":1.5}'::jsonb, '{"calories":10,"protein_g":1,"fat_g":0,"carbs_g":1,"fiber_g":0,"sodium_mg":350,"sugar_g":0}'::jsonb, '/assets/ingredients/condiments/au-jus.png', false, false
FROM categories WHERE slug = 'condiments'
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Olive Oil', 'olive-oil', ARRAY['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free']::text[], 'italian', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":120,"protein_g":0,"fat_g":14,"carbs_g":0,"fiber_g":0,"sodium_mg":0,"sugar_g":0}'::jsonb, '/assets/ingredients/condiments/olive-oil.png', false, false
FROM categories WHERE slug = 'condiments'
ON CONFLICT (category_id, slug) DO NOTHING;
