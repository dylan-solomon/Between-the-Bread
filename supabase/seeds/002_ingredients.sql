INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Sourdough', 'sourdough', ARRAY['vegetarian', 'vegan']::text[], 'neutral', '{"retail_low":0.3,"retail_high":1.2,"restaurant_low":0.9,"restaurant_high":3.6}'::jsonb, '{"calories":120,"protein_g":4,"fat_g":0.5,"carbs_g":24,"fiber_g":1,"sodium_mg":210,"sugar_g":1}'::jsonb, '/assets/ingredients/bread/sourdough.png', false, true
FROM categories WHERE slug = 'bread';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Ciabatta', 'ciabatta', ARRAY['vegetarian', 'vegan']::text[], 'italian', '{"retail_low":0.4,"retail_high":1.25,"restaurant_low":1.2,"restaurant_high":3.75}'::jsonb, '{"calories":130,"protein_g":4,"fat_g":1,"carbs_g":25,"fiber_g":1,"sodium_mg":260,"sugar_g":1}'::jsonb, '/assets/ingredients/bread/ciabatta.png', false, true
FROM categories WHERE slug = 'bread';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Rye', 'rye', ARRAY['vegetarian', 'vegan']::text[], 'deli_classic', '{"retail_low":0.3,"retail_high":1.1,"restaurant_low":0.9,"restaurant_high":3.3}'::jsonb, '{"calories":83,"protein_g":3,"fat_g":1,"carbs_g":15,"fiber_g":2,"sodium_mg":211,"sugar_g":1}'::jsonb, '/assets/ingredients/bread/rye.png', false, true
FROM categories WHERE slug = 'bread';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Whole Wheat', 'whole-wheat', ARRAY['vegetarian', 'vegan']::text[], 'neutral', '{"retail_low":0.25,"retail_high":0.9,"restaurant_low":0.75,"restaurant_high":2.7}'::jsonb, '{"calories":81,"protein_g":4,"fat_g":1,"carbs_g":14,"fiber_g":2,"sodium_mg":146,"sugar_g":1}'::jsonb, '/assets/ingredients/bread/whole-wheat.png', false, true
FROM categories WHERE slug = 'bread';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Brioche', 'brioche', ARRAY['vegetarian']::text[], 'american', '{"retail_low":0.46,"retail_high":1.2,"restaurant_low":1.38,"restaurant_high":3.6}'::jsonb, '{"calories":150,"protein_g":4,"fat_g":5,"carbs_g":22,"fiber_g":1,"sodium_mg":200,"sugar_g":4}'::jsonb, '/assets/ingredients/bread/brioche.png', false, true
FROM categories WHERE slug = 'bread';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Pumpernickel', 'pumpernickel', ARRAY['vegetarian', 'vegan']::text[], 'deli_classic', '{"retail_low":0.36,"retail_high":1.1,"restaurant_low":1.08,"restaurant_high":3.3}'::jsonb, '{"calories":80,"protein_g":3,"fat_g":1,"carbs_g":15,"fiber_g":2,"sodium_mg":191,"sugar_g":1}'::jsonb, '/assets/ingredients/bread/pumpernickel.png', false, true
FROM categories WHERE slug = 'bread';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Focaccia', 'focaccia', ARRAY['vegetarian', 'vegan']::text[], 'italian', '{"retail_low":0.5,"retail_high":1.5,"restaurant_low":1.5,"restaurant_high":4.5}'::jsonb, '{"calories":142,"protein_g":4,"fat_g":4,"carbs_g":22,"fiber_g":1,"sodium_mg":320,"sugar_g":1}'::jsonb, '/assets/ingredients/bread/focaccia.png', false, true
FROM categories WHERE slug = 'bread';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Pita', 'pita', ARRAY['vegetarian', 'vegan']::text[], 'mediterranean', '{"retail_low":0.4,"retail_high":1.3,"restaurant_low":1.2,"restaurant_high":3.9}'::jsonb, '{"calories":165,"protein_g":5,"fat_g":1,"carbs_g":33,"fiber_g":1,"sodium_mg":322,"sugar_g":1}'::jsonb, '/assets/ingredients/bread/pita.png', false, true
FROM categories WHERE slug = 'bread';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Baguette', 'baguette', ARRAY['vegetarian', 'vegan']::text[], 'neutral', '{"retail_low":0.3,"retail_high":1.4,"restaurant_low":0.9,"restaurant_high":4.2}'::jsonb, '{"calories":140,"protein_g":5,"fat_g":1,"carbs_g":28,"fiber_g":1,"sodium_mg":305,"sugar_g":2}'::jsonb, '/assets/ingredients/bread/baguette.png', false, true
FROM categories WHERE slug = 'bread';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Marble Rye', 'marble-rye', ARRAY['vegetarian', 'vegan']::text[], 'deli_classic', '{"retail_low":0.36,"retail_high":1.1,"restaurant_low":1.08,"restaurant_high":3.3}'::jsonb, '{"calories":83,"protein_g":3,"fat_g":1,"carbs_g":15,"fiber_g":2,"sodium_mg":195,"sugar_g":1}'::jsonb, '/assets/ingredients/bread/marble-rye.png', false, true
FROM categories WHERE slug = 'bread';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Everything Bagel', 'everything-bagel', ARRAY['vegetarian', 'vegan']::text[], 'deli_classic', '{"retail_low":0.6,"retail_high":1.5,"restaurant_low":1.8,"restaurant_high":4.5}'::jsonb, '{"calories":270,"protein_g":10,"fat_g":2,"carbs_g":53,"fiber_g":2,"sodium_mg":500,"sugar_g":6}'::jsonb, '/assets/ingredients/bread/everything-bagel.png', false, true
FROM categories WHERE slug = 'bread';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Croissant', 'croissant', ARRAY['vegetarian']::text[], 'neutral', '{"retail_low":0.8,"retail_high":2.5,"restaurant_low":2.4,"restaurant_high":7.5}'::jsonb, '{"calories":231,"protein_g":5,"fat_g":12,"carbs_g":26,"fiber_g":1,"sodium_mg":312,"sugar_g":5}'::jsonb, '/assets/ingredients/bread/croissant.png', false, true
FROM categories WHERE slug = 'bread';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Pretzel Roll', 'pretzel-roll', ARRAY['vegetarian', 'vegan']::text[], 'american', '{"retail_low":0.6,"retail_high":1.5,"restaurant_low":1.8,"restaurant_high":4.5}'::jsonb, '{"calories":190,"protein_g":6,"fat_g":2,"carbs_g":37,"fiber_g":1,"sodium_mg":580,"sugar_g":2}'::jsonb, '/assets/ingredients/bread/pretzel-roll.png', false, true
FROM categories WHERE slug = 'bread';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Texas Toast', 'texas-toast', ARRAY['vegetarian']::text[], 'southern', '{"retail_low":0.4,"retail_high":1,"restaurant_low":1.2,"restaurant_high":3}'::jsonb, '{"calories":150,"protein_g":4,"fat_g":4,"carbs_g":24,"fiber_g":1,"sodium_mg":240,"sugar_g":3}'::jsonb, '/assets/ingredients/bread/texas-toast.png', false, true
FROM categories WHERE slug = 'bread';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Naan', 'naan', ARRAY['vegetarian']::text[], 'mediterranean', '{"retail_low":0.5,"retail_high":1.5,"restaurant_low":1.5,"restaurant_high":4.5}'::jsonb, '{"calories":262,"protein_g":9,"fat_g":5,"carbs_g":45,"fiber_g":2,"sodium_mg":418,"sugar_g":3}'::jsonb, '/assets/ingredients/bread/naan.png', false, true
FROM categories WHERE slug = 'bread';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'White Bread', 'white-bread', ARRAY['vegetarian', 'vegan']::text[], 'american', '{"retail_low":0.2,"retail_high":0.8,"restaurant_low":0.6,"restaurant_high":2.4}'::jsonb, '{"calories":79,"protein_g":3,"fat_g":1,"carbs_g":15,"fiber_g":1,"sodium_mg":147,"sugar_g":2}'::jsonb, '/assets/ingredients/bread/white-bread.png', false, true
FROM categories WHERE slug = 'bread';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Tortilla', 'tortilla', ARRAY['vegetarian', 'vegan', 'dairy_free']::text[], 'tex_mex', '{"retail_low":0.2,"retail_high":0.6,"restaurant_low":0.6,"restaurant_high":1.8}'::jsonb, '{"calories":140,"protein_g":4,"fat_g":3,"carbs_g":24,"fiber_g":1,"sodium_mg":360,"sugar_g":1}'::jsonb, '/assets/ingredients/bread/tortilla.png', false, true
FROM categories WHERE slug = 'bread';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Turkey', 'turkey', ARRAY['dairy_free']::text[], 'deli_classic', '{"retail_low":0.8,"retail_high":2,"restaurant_low":2.4,"restaurant_high":6}'::jsonb, '{"calories":60,"protein_g":12,"fat_g":1,"carbs_g":1,"fiber_g":0,"sodium_mg":440,"sugar_g":1}'::jsonb, '/assets/ingredients/protein/turkey.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Roast Beef', 'roast-beef', ARRAY['dairy_free']::text[], 'deli_classic', '{"retail_low":1.2,"retail_high":2.5,"restaurant_low":3.6,"restaurant_high":7.5}'::jsonb, '{"calories":70,"protein_g":12,"fat_g":2,"carbs_g":1,"fiber_g":0,"sodium_mg":400,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/roast-beef.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Ham', 'ham', ARRAY['dairy_free']::text[], 'deli_classic', '{"retail_low":0.7,"retail_high":1.8,"restaurant_low":2.1,"restaurant_high":5.4}'::jsonb, '{"calories":60,"protein_g":10,"fat_g":2,"carbs_g":1,"fiber_g":0,"sodium_mg":520,"sugar_g":1}'::jsonb, '/assets/ingredients/protein/ham.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Salami', 'salami', ARRAY['dairy_free']::text[], 'italian', '{"retail_low":0.9,"retail_high":2.2,"restaurant_low":2.7,"restaurant_high":6.6}'::jsonb, '{"calories":120,"protein_g":7,"fat_g":10,"carbs_g":0,"fiber_g":0,"sodium_mg":530,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/salami.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Prosciutto', 'prosciutto', ARRAY['dairy_free']::text[], 'italian', '{"retail_low":1.5,"retail_high":3.5,"restaurant_low":4.5,"restaurant_high":10.5}'::jsonb, '{"calories":100,"protein_g":9,"fat_g":7,"carbs_g":0,"fiber_g":0,"sodium_mg":640,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/prosciutto.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Grilled Chicken', 'grilled-chicken', ARRAY['dairy_free', 'gluten_free']::text[], 'neutral', '{"retail_low":0.8,"retail_high":2,"restaurant_low":2.4,"restaurant_high":6}'::jsonb, '{"calories":90,"protein_g":18,"fat_g":2,"carbs_g":0,"fiber_g":0,"sodium_mg":280,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/grilled-chicken.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Bacon', 'bacon', ARRAY['dairy_free', 'gluten_free']::text[], 'american', '{"retail_low":0.6,"retail_high":1.5,"restaurant_low":1.8,"restaurant_high":4.5}'::jsonb, '{"calories":90,"protein_g":6,"fat_g":7,"carbs_g":0,"fiber_g":0,"sodium_mg":360,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/bacon.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Pastrami', 'pastrami', ARRAY['dairy_free']::text[], 'deli_classic', '{"retail_low":1,"retail_high":2.4,"restaurant_low":3,"restaurant_high":7.2}'::jsonb, '{"calories":80,"protein_g":12,"fat_g":3,"carbs_g":1,"fiber_g":0,"sodium_mg":600,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/pastrami.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Pepperoni', 'pepperoni', ARRAY['dairy_free']::text[], 'italian', '{"retail_low":0.8,"retail_high":2,"restaurant_low":2.4,"restaurant_high":6}'::jsonb, '{"calories":140,"protein_g":6,"fat_g":12,"carbs_g":1,"fiber_g":0,"sodium_mg":500,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/pepperoni.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Smoked Salmon', 'smoked-salmon', ARRAY['dairy_free', 'gluten_free']::text[], 'neutral', '{"retail_low":1.5,"retail_high":3,"restaurant_low":4.5,"restaurant_high":9}'::jsonb, '{"calories":66,"protein_g":10,"fat_g":3,"carbs_g":0,"fiber_g":0,"sodium_mg":520,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/smoked-salmon.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Pulled Pork', 'pulled-pork', ARRAY['dairy_free', 'gluten_free']::text[], 'southern', '{"retail_low":0.8,"retail_high":2,"restaurant_low":2.4,"restaurant_high":6}'::jsonb, '{"calories":100,"protein_g":14,"fat_g":5,"carbs_g":0,"fiber_g":0,"sodium_mg":350,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/pulled-pork.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Corned Beef', 'corned-beef', ARRAY['dairy_free', 'gluten_free']::text[], 'deli_classic', '{"retail_low":1,"retail_high":2.5,"restaurant_low":3,"restaurant_high":7.5}'::jsonb, '{"calories":100,"protein_g":12,"fat_g":6,"carbs_g":0,"fiber_g":0,"sodium_mg":540,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/corned-beef.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Mortadella', 'mortadella', ARRAY['dairy_free']::text[], 'italian', '{"retail_low":0.8,"retail_high":2,"restaurant_low":2.4,"restaurant_high":6}'::jsonb, '{"calories":96,"protein_g":5,"fat_g":8,"carbs_g":1,"fiber_g":0,"sodium_mg":420,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/mortadella.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Capicola', 'capicola', ARRAY['dairy_free', 'gluten_free']::text[], 'italian', '{"retail_low":1,"retail_high":2.4,"restaurant_low":3,"restaurant_high":7.2}'::jsonb, '{"calories":80,"protein_g":8,"fat_g":5,"carbs_g":0,"fiber_g":0,"sodium_mg":480,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/capicola.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Tuna Salad', 'tuna-salad', ARRAY['gluten_free']::text[], 'american', '{"retail_low":0.7,"retail_high":1.8,"restaurant_low":2.1,"restaurant_high":5.4}'::jsonb, '{"calories":120,"protein_g":10,"fat_g":8,"carbs_g":2,"fiber_g":0,"sodium_mg":300,"sugar_g":1}'::jsonb, '/assets/ingredients/protein/tuna-salad.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Egg Salad', 'egg-salad', ARRAY['vegetarian', 'gluten_free']::text[], 'american', '{"retail_low":0.5,"retail_high":1.2,"restaurant_low":1.5,"restaurant_high":3.6}'::jsonb, '{"calories":110,"protein_g":6,"fat_g":9,"carbs_g":1,"fiber_g":0,"sodium_mg":260,"sugar_g":1}'::jsonb, '/assets/ingredients/protein/egg-salad.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Fried Egg', 'fried-egg', ARRAY['vegetarian', 'gluten_free', 'dairy_free']::text[], 'american', '{"retail_low":0.25,"retail_high":0.6,"restaurant_low":0.75,"restaurant_high":1.8}'::jsonb, '{"calories":90,"protein_g":6,"fat_g":7,"carbs_g":0,"fiber_g":0,"sodium_mg":170,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/fried-egg.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Tofu', 'tofu', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'asian_fusion', '{"retail_low":0.3,"retail_high":0.8,"restaurant_low":0.9,"restaurant_high":2.4}'::jsonb, '{"calories":50,"protein_g":6,"fat_g":3,"carbs_g":1,"fiber_g":0,"sodium_mg":10,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/tofu.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Tempeh', 'tempeh', ARRAY['vegetarian', 'vegan', 'dairy_free']::text[], 'asian_fusion', '{"retail_low":0.5,"retail_high":1.2,"restaurant_low":1.5,"restaurant_high":3.6}'::jsonb, '{"calories":110,"protein_g":11,"fat_g":6,"carbs_g":5,"fiber_g":3,"sodium_mg":8,"sugar_g":0}'::jsonb, '/assets/ingredients/protein/tempeh.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Falafel', 'falafel', ARRAY['vegetarian', 'vegan', 'dairy_free']::text[], 'mediterranean', '{"retail_low":0.5,"retail_high":1.2,"restaurant_low":1.5,"restaurant_high":3.6}'::jsonb, '{"calories":110,"protein_g":5,"fat_g":6,"carbs_g":12,"fiber_g":3,"sodium_mg":280,"sugar_g":1}'::jsonb, '/assets/ingredients/protein/falafel.png', false, true
FROM categories WHERE slug = 'protein';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Cheddar', 'cheddar', ARRAY['vegetarian', 'gluten_free']::text[], 'american', '{"retail_low":0.4,"retail_high":1.2,"restaurant_low":1.2,"restaurant_high":3.6}'::jsonb, '{"calories":113,"protein_g":7,"fat_g":9,"carbs_g":0,"fiber_g":0,"sodium_mg":176,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/cheddar.png', false, true
FROM categories WHERE slug = 'cheese';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Swiss', 'swiss', ARRAY['vegetarian', 'gluten_free']::text[], 'deli_classic', '{"retail_low":0.4,"retail_high":1.2,"restaurant_low":1.2,"restaurant_high":3.6}'::jsonb, '{"calories":106,"protein_g":8,"fat_g":8,"carbs_g":2,"fiber_g":0,"sodium_mg":54,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/swiss.png', false, true
FROM categories WHERE slug = 'cheese';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Provolone', 'provolone', ARRAY['vegetarian', 'gluten_free']::text[], 'italian', '{"retail_low":0.4,"retail_high":1.2,"restaurant_low":1.2,"restaurant_high":3.6}'::jsonb, '{"calories":98,"protein_g":7,"fat_g":7,"carbs_g":1,"fiber_g":0,"sodium_mg":248,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/provolone.png', false, true
FROM categories WHERE slug = 'cheese';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Mozzarella', 'mozzarella', ARRAY['vegetarian', 'gluten_free']::text[], 'italian', '{"retail_low":0.4,"retail_high":1.2,"restaurant_low":1.2,"restaurant_high":3.6}'::jsonb, '{"calories":85,"protein_g":6,"fat_g":6,"carbs_g":1,"fiber_g":0,"sodium_mg":178,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/mozzarella.png', false, true
FROM categories WHERE slug = 'cheese';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Pepper Jack', 'pepper-jack', ARRAY['vegetarian', 'gluten_free']::text[], 'tex_mex', '{"retail_low":0.4,"retail_high":1.2,"restaurant_low":1.2,"restaurant_high":3.6}'::jsonb, '{"calories":110,"protein_g":7,"fat_g":9,"carbs_g":0,"fiber_g":0,"sodium_mg":190,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/pepper-jack.png', false, true
FROM categories WHERE slug = 'cheese';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Gouda', 'gouda', ARRAY['vegetarian', 'gluten_free']::text[], 'neutral', '{"retail_low":0.4,"retail_high":1.2,"restaurant_low":1.2,"restaurant_high":3.6}'::jsonb, '{"calories":101,"protein_g":7,"fat_g":8,"carbs_g":1,"fiber_g":0,"sodium_mg":232,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/gouda.png', false, true
FROM categories WHERE slug = 'cheese';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Brie', 'brie', ARRAY['vegetarian', 'gluten_free']::text[], 'neutral', '{"retail_low":0.6,"retail_high":1.8,"restaurant_low":1.8,"restaurant_high":5.4}'::jsonb, '{"calories":95,"protein_g":6,"fat_g":8,"carbs_g":0,"fiber_g":0,"sodium_mg":178,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/brie.png', false, true
FROM categories WHERE slug = 'cheese';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Gruyere', 'gruyere', ARRAY['vegetarian', 'gluten_free']::text[], 'neutral', '{"retail_low":0.6,"retail_high":1.8,"restaurant_low":1.8,"restaurant_high":5.4}'::jsonb, '{"calories":117,"protein_g":8,"fat_g":9,"carbs_g":0,"fiber_g":0,"sodium_mg":95,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/gruyere.png', false, true
FROM categories WHERE slug = 'cheese';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Muenster', 'muenster', ARRAY['vegetarian', 'gluten_free']::text[], 'american', '{"retail_low":0.4,"retail_high":1.2,"restaurant_low":1.2,"restaurant_high":3.6}'::jsonb, '{"calories":104,"protein_g":7,"fat_g":8,"carbs_g":0,"fiber_g":0,"sodium_mg":178,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/muenster.png', false, true
FROM categories WHERE slug = 'cheese';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Havarti', 'havarti', ARRAY['vegetarian', 'gluten_free']::text[], 'neutral', '{"retail_low":0.4,"retail_high":1.2,"restaurant_low":1.2,"restaurant_high":3.6}'::jsonb, '{"calories":105,"protein_g":6,"fat_g":9,"carbs_g":0,"fiber_g":0,"sodium_mg":215,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/havarti.png', false, true
FROM categories WHERE slug = 'cheese';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Blue Cheese', 'blue-cheese', ARRAY['vegetarian', 'gluten_free']::text[], 'neutral', '{"retail_low":0.5,"retail_high":1.5,"restaurant_low":1.5,"restaurant_high":4.5}'::jsonb, '{"calories":100,"protein_g":6,"fat_g":8,"carbs_g":1,"fiber_g":0,"sodium_mg":325,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/blue-cheese.png', false, true
FROM categories WHERE slug = 'cheese';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Manchego', 'manchego', ARRAY['vegetarian', 'gluten_free']::text[], 'mediterranean', '{"retail_low":0.6,"retail_high":1.8,"restaurant_low":1.8,"restaurant_high":5.4}'::jsonb, '{"calories":110,"protein_g":7,"fat_g":9,"carbs_g":0,"fiber_g":0,"sodium_mg":180,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/manchego.png', false, true
FROM categories WHERE slug = 'cheese';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Cream Cheese', 'cream-cheese', ARRAY['vegetarian', 'gluten_free']::text[], 'deli_classic', '{"retail_low":0.3,"retail_high":0.8,"restaurant_low":0.9,"restaurant_high":2.4}'::jsonb, '{"calories":99,"protein_g":2,"fat_g":10,"carbs_g":1,"fiber_g":0,"sodium_mg":85,"sugar_g":1}'::jsonb, '/assets/ingredients/cheese/cream-cheese.png', false, true
FROM categories WHERE slug = 'cheese';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Burrata', 'burrata', ARRAY['vegetarian', 'gluten_free']::text[], 'italian', '{"retail_low":0.7,"retail_high":1.8,"restaurant_low":2.1,"restaurant_high":5.4}'::jsonb, '{"calories":90,"protein_g":5,"fat_g":7,"carbs_g":1,"fiber_g":0,"sodium_mg":120,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/burrata.png', false, true
FROM categories WHERE slug = 'cheese';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Goat Cheese', 'goat-cheese', ARRAY['vegetarian', 'gluten_free']::text[], 'mediterranean', '{"retail_low":0.6,"retail_high":1.8,"restaurant_low":1.8,"restaurant_high":5.4}'::jsonb, '{"calories":75,"protein_g":5,"fat_g":6,"carbs_g":0,"fiber_g":0,"sodium_mg":130,"sugar_g":0}'::jsonb, '/assets/ingredients/cheese/goat-cheese.png', false, true
FROM categories WHERE slug = 'cheese';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Cheese Whip', 'cheese-whip', ARRAY['vegetarian', 'gluten_free']::text[], 'american', '{"retail_low":0.2,"retail_high":0.6,"restaurant_low":0.6,"restaurant_high":1.8}'::jsonb, '{"calories":80,"protein_g":2,"fat_g":6,"carbs_g":4,"fiber_g":0,"sodium_mg":310,"sugar_g":3}'::jsonb, '/assets/ingredients/cheese/cheese-whip.png', false, true
FROM categories WHERE slug = 'cheese';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'No Cheese', 'no-cheese', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'neutral', '{"retail_low":0,"retail_high":0,"restaurant_low":0,"restaurant_high":0}'::jsonb, '{"calories":0,"protein_g":0,"fat_g":0,"carbs_g":0,"fiber_g":0,"sodium_mg":0,"sugar_g":0}'::jsonb, NULL, false, true
FROM categories WHERE slug = 'cheese';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Lettuce', 'lettuce', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'neutral', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":5,"protein_g":0,"fat_g":0,"carbs_g":1,"fiber_g":1,"sodium_mg":5,"sugar_g":0}'::jsonb, '/assets/ingredients/toppings/lettuce.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Tomato', 'tomato', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'neutral', '{"retail_low":0.15,"retail_high":0.5,"restaurant_low":0.45,"restaurant_high":1.5}'::jsonb, '{"calories":5,"protein_g":0,"fat_g":0,"carbs_g":1,"fiber_g":0,"sodium_mg":2,"sugar_g":1}'::jsonb, '/assets/ingredients/toppings/tomato.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Red Onion', 'red-onion', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'neutral', '{"retail_low":0.1,"retail_high":0.3,"restaurant_low":0.3,"restaurant_high":0.9}'::jsonb, '{"calories":12,"protein_g":0,"fat_g":0,"carbs_g":3,"fiber_g":0,"sodium_mg":1,"sugar_g":1}'::jsonb, '/assets/ingredients/toppings/red-onion.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Pickles', 'pickles', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'deli_classic', '{"retail_low":0.1,"retail_high":0.3,"restaurant_low":0.3,"restaurant_high":0.9}'::jsonb, '{"calories":4,"protein_g":0,"fat_g":0,"carbs_g":1,"fiber_g":0,"sodium_mg":283,"sugar_g":0}'::jsonb, '/assets/ingredients/toppings/pickles.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Avocado', 'avocado', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'neutral', '{"retail_low":0.4,"retail_high":1,"restaurant_low":1.2,"restaurant_high":3}'::jsonb, '{"calories":50,"protein_g":1,"fat_g":5,"carbs_g":3,"fiber_g":2,"sodium_mg":2,"sugar_g":0}'::jsonb, '/assets/ingredients/toppings/avocado.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Roasted Peppers', 'roasted-peppers', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'italian', '{"retail_low":0.2,"retail_high":0.6,"restaurant_low":0.6,"restaurant_high":1.8}'::jsonb, '{"calories":10,"protein_g":0,"fat_g":0,"carbs_g":2,"fiber_g":1,"sodium_mg":3,"sugar_g":1}'::jsonb, '/assets/ingredients/toppings/roasted-peppers.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Banana Peppers', 'banana-peppers', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'italian', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":4,"protein_g":0,"fat_g":0,"carbs_g":1,"fiber_g":0,"sodium_mg":180,"sugar_g":0}'::jsonb, '/assets/ingredients/toppings/banana-peppers.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Jalapenos', 'jalapenos', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'tex_mex', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":4,"protein_g":0,"fat_g":0,"carbs_g":1,"fiber_g":0,"sodium_mg":1,"sugar_g":1}'::jsonb, '/assets/ingredients/toppings/jalapenos.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Sprouts', 'sprouts', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'neutral', '{"retail_low":0.2,"retail_high":0.6,"restaurant_low":0.6,"restaurant_high":1.8}'::jsonb, '{"calories":8,"protein_g":1,"fat_g":0,"carbs_g":1,"fiber_g":0,"sodium_mg":2,"sugar_g":0}'::jsonb, '/assets/ingredients/toppings/sprouts.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Arugula', 'arugula', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'italian', '{"retail_low":0.2,"retail_high":0.6,"restaurant_low":0.6,"restaurant_high":1.8}'::jsonb, '{"calories":5,"protein_g":1,"fat_g":0,"carbs_g":1,"fiber_g":0,"sodium_mg":5,"sugar_g":0}'::jsonb, '/assets/ingredients/toppings/arugula.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Sauerkraut', 'sauerkraut', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'deli_classic', '{"retail_low":0.15,"retail_high":0.4,"restaurant_low":0.45,"restaurant_high":1.2}'::jsonb, '{"calories":6,"protein_g":0,"fat_g":0,"carbs_g":1,"fiber_g":1,"sodium_mg":220,"sugar_g":0}'::jsonb, '/assets/ingredients/toppings/sauerkraut.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Coleslaw', 'coleslaw', ARRAY['vegetarian', 'gluten_free']::text[], 'southern', '{"retail_low":0.2,"retail_high":0.6,"restaurant_low":0.6,"restaurant_high":1.8}'::jsonb, '{"calories":40,"protein_g":0,"fat_g":2,"carbs_g":5,"fiber_g":1,"sodium_mg":120,"sugar_g":3}'::jsonb, '/assets/ingredients/toppings/coleslaw.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Olives', 'olives', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'mediterranean', '{"retail_low":0.2,"retail_high":0.6,"restaurant_low":0.6,"restaurant_high":1.8}'::jsonb, '{"calories":25,"protein_g":0,"fat_g":2,"carbs_g":1,"fiber_g":1,"sodium_mg":310,"sugar_g":0}'::jsonb, '/assets/ingredients/toppings/olives.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Cucumbers', 'cucumbers', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'mediterranean', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":4,"protein_g":0,"fat_g":0,"carbs_g":1,"fiber_g":0,"sodium_mg":1,"sugar_g":0}'::jsonb, '/assets/ingredients/toppings/cucumbers.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Sun-Dried Tomatoes', 'sun-dried-tomatoes', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'italian', '{"retail_low":0.3,"retail_high":0.8,"restaurant_low":0.9,"restaurant_high":2.4}'::jsonb, '{"calories":35,"protein_g":2,"fat_g":0,"carbs_g":7,"fiber_g":1,"sodium_mg":130,"sugar_g":4}'::jsonb, '/assets/ingredients/toppings/sun-dried-tomatoes.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Artichoke Hearts', 'artichoke-hearts', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'mediterranean', '{"retail_low":0.3,"retail_high":0.9,"restaurant_low":0.9,"restaurant_high":2.7}'::jsonb, '{"calories":15,"protein_g":1,"fat_g":0,"carbs_g":3,"fiber_g":1,"sodium_mg":120,"sugar_g":0}'::jsonb, '/assets/ingredients/toppings/artichoke-hearts.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Caramelized Onions', 'caramelized-onions', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'neutral', '{"retail_low":0.2,"retail_high":0.6,"restaurant_low":0.6,"restaurant_high":1.8}'::jsonb, '{"calories":30,"protein_g":0,"fat_g":1,"carbs_g":5,"fiber_g":1,"sodium_mg":5,"sugar_g":3}'::jsonb, '/assets/ingredients/toppings/caramelized-onions.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Kimchi', 'kimchi', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'asian_fusion', '{"retail_low":0.2,"retail_high":0.6,"restaurant_low":0.6,"restaurant_high":1.8}'::jsonb, '{"calories":10,"protein_g":1,"fat_g":0,"carbs_g":2,"fiber_g":1,"sodium_mg":290,"sugar_g":1}'::jsonb, '/assets/ingredients/toppings/kimchi.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Microgreens', 'microgreens', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'neutral', '{"retail_low":0.3,"retail_high":1,"restaurant_low":0.9,"restaurant_high":3}'::jsonb, '{"calories":5,"protein_g":1,"fat_g":0,"carbs_g":1,"fiber_g":0,"sodium_mg":3,"sugar_g":0}'::jsonb, '/assets/ingredients/toppings/microgreens.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Pickled Red Onion', 'pickled-red-onion', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'neutral', '{"retail_low":0.15,"retail_high":0.5,"restaurant_low":0.45,"restaurant_high":1.5}'::jsonb, '{"calories":10,"protein_g":0,"fat_g":0,"carbs_g":2,"fiber_g":0,"sodium_mg":80,"sugar_g":1}'::jsonb, '/assets/ingredients/toppings/pickled-red-onion.png', false, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Chef''s Pick A', 'chefs-pick-a', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'neutral', '{"retail_low":0,"retail_high":0,"restaurant_low":0,"restaurant_high":0}'::jsonb, '{"calories":0,"protein_g":0,"fat_g":0,"carbs_g":0,"fiber_g":0,"sodium_mg":0,"sugar_g":0}'::jsonb, NULL, true, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Chef''s Pick B', 'chefs-pick-b', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'neutral', '{"retail_low":0,"retail_high":0,"restaurant_low":0,"restaurant_high":0}'::jsonb, '{"calories":0,"protein_g":0,"fat_g":0,"carbs_g":0,"fiber_g":0,"sodium_mg":0,"sugar_g":0}'::jsonb, NULL, true, true
FROM categories WHERE slug = 'toppings';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Mayo', 'mayo', ARRAY['vegetarian', 'gluten_free']::text[], 'neutral', '{"retail_low":0.05,"retail_high":0.25,"restaurant_low":0.15,"restaurant_high":0.75}'::jsonb, '{"calories":94,"protein_g":0,"fat_g":10,"carbs_g":0,"fiber_g":0,"sodium_mg":88,"sugar_g":0}'::jsonb, '/assets/ingredients/condiments/mayo.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Mustard', 'mustard', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'deli_classic', '{"retail_low":0.03,"retail_high":0.15,"restaurant_low":0.09,"restaurant_high":0.45}'::jsonb, '{"calories":3,"protein_g":0,"fat_g":0,"carbs_g":0,"fiber_g":0,"sodium_mg":56,"sugar_g":0}'::jsonb, '/assets/ingredients/condiments/mustard.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Dijon', 'dijon', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'neutral', '{"retail_low":0.05,"retail_high":0.25,"restaurant_low":0.15,"restaurant_high":0.75}'::jsonb, '{"calories":5,"protein_g":0,"fat_g":0,"carbs_g":0,"fiber_g":0,"sodium_mg":120,"sugar_g":0}'::jsonb, '/assets/ingredients/condiments/dijon.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Hot Sauce', 'hot-sauce', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'neutral', '{"retail_low":0.02,"retail_high":0.15,"restaurant_low":0.06,"restaurant_high":0.45}'::jsonb, '{"calories":0,"protein_g":0,"fat_g":0,"carbs_g":0,"fiber_g":0,"sodium_mg":190,"sugar_g":0}'::jsonb, '/assets/ingredients/condiments/hot-sauce.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Ranch', 'ranch', ARRAY['vegetarian', 'gluten_free']::text[], 'american', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":73,"protein_g":0,"fat_g":8,"carbs_g":1,"fiber_g":0,"sodium_mg":130,"sugar_g":1}'::jsonb, '/assets/ingredients/condiments/ranch.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Pesto', 'pesto', ARRAY['vegetarian', 'gluten_free']::text[], 'italian', '{"retail_low":0.2,"retail_high":0.8,"restaurant_low":0.6,"restaurant_high":2.4}'::jsonb, '{"calories":80,"protein_g":2,"fat_g":8,"carbs_g":1,"fiber_g":0,"sodium_mg":180,"sugar_g":0}'::jsonb, '/assets/ingredients/condiments/pesto.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Aioli', 'aioli', ARRAY['vegetarian', 'gluten_free']::text[], 'mediterranean', '{"retail_low":0.15,"retail_high":0.6,"restaurant_low":0.45,"restaurant_high":1.8}'::jsonb, '{"calories":90,"protein_g":0,"fat_g":10,"carbs_g":0,"fiber_g":0,"sodium_mg":95,"sugar_g":0}'::jsonb, '/assets/ingredients/condiments/aioli.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Hummus', 'hummus', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'mediterranean', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":25,"protein_g":1,"fat_g":1,"carbs_g":3,"fiber_g":1,"sodium_mg":57,"sugar_g":0}'::jsonb, '/assets/ingredients/condiments/hummus.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Chipotle Mayo', 'chipotle-mayo', ARRAY['vegetarian', 'gluten_free']::text[], 'tex_mex', '{"retail_low":0.15,"retail_high":0.6,"restaurant_low":0.45,"restaurant_high":1.8}'::jsonb, '{"calories":90,"protein_g":0,"fat_g":10,"carbs_g":1,"fiber_g":0,"sodium_mg":120,"sugar_g":0}'::jsonb, '/assets/ingredients/condiments/chipotle-mayo.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Honey Mustard', 'honey-mustard', ARRAY['vegetarian', 'gluten_free']::text[], 'american', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":30,"protein_g":0,"fat_g":1,"carbs_g":5,"fiber_g":0,"sodium_mg":90,"sugar_g":4}'::jsonb, '/assets/ingredients/condiments/honey-mustard.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'BBQ Sauce', 'bbq-sauce', ARRAY['vegetarian', 'vegan', 'dairy_free']::text[], 'southern', '{"retail_low":0.05,"retail_high":0.3,"restaurant_low":0.15,"restaurant_high":0.9}'::jsonb, '{"calories":29,"protein_g":0,"fat_g":0,"carbs_g":7,"fiber_g":0,"sodium_mg":175,"sugar_g":5}'::jsonb, '/assets/ingredients/condiments/bbq-sauce.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Sriracha', 'sriracha', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'asian_fusion', '{"retail_low":0.05,"retail_high":0.25,"restaurant_low":0.15,"restaurant_high":0.75}'::jsonb, '{"calories":5,"protein_g":0,"fat_g":0,"carbs_g":1,"fiber_g":0,"sodium_mg":100,"sugar_g":1}'::jsonb, '/assets/ingredients/condiments/sriracha.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Olive Oil & Vinegar', 'olive-oil-vinegar', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'italian', '{"retail_low":0.1,"retail_high":0.5,"restaurant_low":0.3,"restaurant_high":1.5}'::jsonb, '{"calories":60,"protein_g":0,"fat_g":7,"carbs_g":0,"fiber_g":0,"sodium_mg":0,"sugar_g":0}'::jsonb, '/assets/ingredients/condiments/olive-oil-vinegar.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Horseradish', 'horseradish', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'deli_classic', '{"retail_low":0.05,"retail_high":0.3,"restaurant_low":0.15,"restaurant_high":0.9}'::jsonb, '{"calories":7,"protein_g":0,"fat_g":0,"carbs_g":2,"fiber_g":0,"sodium_mg":47,"sugar_g":1}'::jsonb, '/assets/ingredients/condiments/horseradish.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Tzatziki', 'tzatziki', ARRAY['vegetarian', 'gluten_free']::text[], 'mediterranean', '{"retail_low":0.15,"retail_high":0.5,"restaurant_low":0.45,"restaurant_high":1.5}'::jsonb, '{"calories":17,"protein_g":1,"fat_g":1,"carbs_g":1,"fiber_g":0,"sodium_mg":60,"sugar_g":1}'::jsonb, '/assets/ingredients/condiments/tzatziki.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Buffalo Sauce', 'buffalo-sauce', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'american', '{"retail_low":0.05,"retail_high":0.3,"restaurant_low":0.15,"restaurant_high":0.9}'::jsonb, '{"calories":10,"protein_g":0,"fat_g":1,"carbs_g":0,"fiber_g":0,"sodium_mg":300,"sugar_g":0}'::jsonb, '/assets/ingredients/condiments/buffalo-sauce.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Garlic Butter', 'garlic-butter', ARRAY['vegetarian', 'gluten_free']::text[], 'neutral', '{"retail_low":0.15,"retail_high":0.6,"restaurant_low":0.45,"restaurant_high":1.8}'::jsonb, '{"calories":100,"protein_g":0,"fat_g":11,"carbs_g":0,"fiber_g":0,"sodium_mg":85,"sugar_g":0}'::jsonb, '/assets/ingredients/condiments/garlic-butter.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Balsamic Glaze', 'balsamic-glaze', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'italian', '{"retail_low":0.15,"retail_high":0.5,"restaurant_low":0.45,"restaurant_high":1.5}'::jsonb, '{"calories":20,"protein_g":0,"fat_g":0,"carbs_g":5,"fiber_g":0,"sodium_mg":10,"sugar_g":4}'::jsonb, '/assets/ingredients/condiments/balsamic-glaze.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Russian Dressing', 'russian-dressing', ARRAY['vegetarian', 'gluten_free']::text[], 'deli_classic', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":57,"protein_g":0,"fat_g":5,"carbs_g":3,"fiber_g":0,"sodium_mg":130,"sugar_g":2}'::jsonb, '/assets/ingredients/condiments/russian-dressing.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Green Goddess', 'green-goddess', ARRAY['vegetarian', 'gluten_free']::text[], 'neutral', '{"retail_low":0.2,"retail_high":0.6,"restaurant_low":0.6,"restaurant_high":1.8}'::jsonb, '{"calories":60,"protein_g":0,"fat_g":6,"carbs_g":1,"fiber_g":0,"sodium_mg":140,"sugar_g":0}'::jsonb, '/assets/ingredients/condiments/green-goddess.png', false, true
FROM categories WHERE slug = 'condiments';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Truffle Oil Drizzle', 'truffle-oil-drizzle', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'italian', '{"retail_low":0.3,"retail_high":1,"restaurant_low":0.9,"restaurant_high":3}'::jsonb, '{"calories":40,"protein_g":0,"fat_g":5,"carbs_g":0,"fiber_g":0,"sodium_mg":0,"sugar_g":0}'::jsonb, '/assets/ingredients/chefs-special/truffle-oil-drizzle.png', false, true
FROM categories WHERE slug = 'chefs-special';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Fried Onion Strings', 'fried-onion-strings', ARRAY['vegetarian', 'vegan']::text[], 'american', '{"retail_low":0.2,"retail_high":0.6,"restaurant_low":0.6,"restaurant_high":1.8}'::jsonb, '{"calories":45,"protein_g":1,"fat_g":3,"carbs_g":5,"fiber_g":0,"sodium_mg":65,"sugar_g":1}'::jsonb, '/assets/ingredients/chefs-special/fried-onion-strings.png', false, true
FROM categories WHERE slug = 'chefs-special';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Everything Bagel Seasoning', 'everything-bagel-seasoning', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'deli_classic', '{"retail_low":0.05,"retail_high":0.2,"restaurant_low":0.15,"restaurant_high":0.6}'::jsonb, '{"calories":5,"protein_g":0,"fat_g":0,"carbs_g":1,"fiber_g":0,"sodium_mg":160,"sugar_g":0}'::jsonb, '/assets/ingredients/chefs-special/everything-bagel-seasoning.png', false, true
FROM categories WHERE slug = 'chefs-special';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Crushed Potato Chips', 'crushed-potato-chips', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'american', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":40,"protein_g":0,"fat_g":3,"carbs_g":4,"fiber_g":0,"sodium_mg":50,"sugar_g":0}'::jsonb, '/assets/ingredients/chefs-special/crushed-potato-chips.png', false, true
FROM categories WHERE slug = 'chefs-special';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Pickle Relish', 'pickle-relish', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'american', '{"retail_low":0.05,"retail_high":0.25,"restaurant_low":0.15,"restaurant_high":0.75}'::jsonb, '{"calories":15,"protein_g":0,"fat_g":0,"carbs_g":4,"fiber_g":0,"sodium_mg":122,"sugar_g":3}'::jsonb, '/assets/ingredients/chefs-special/pickle-relish.png', false, true
FROM categories WHERE slug = 'chefs-special';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Cranberry Sauce', 'cranberry-sauce', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'american', '{"retail_low":0.1,"retail_high":0.4,"restaurant_low":0.3,"restaurant_high":1.2}'::jsonb, '{"calories":22,"protein_g":0,"fat_g":0,"carbs_g":6,"fiber_g":0,"sodium_mg":4,"sugar_g":4}'::jsonb, '/assets/ingredients/chefs-special/cranberry-sauce.png', false, true
FROM categories WHERE slug = 'chefs-special';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Mango Chutney', 'mango-chutney', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'asian_fusion', '{"retail_low":0.15,"retail_high":0.5,"restaurant_low":0.45,"restaurant_high":1.5}'::jsonb, '{"calories":30,"protein_g":0,"fat_g":0,"carbs_g":8,"fiber_g":0,"sodium_mg":95,"sugar_g":6}'::jsonb, '/assets/ingredients/chefs-special/mango-chutney.png', false, true
FROM categories WHERE slug = 'chefs-special';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Bacon Jam', 'bacon-jam', ARRAY['gluten_free', 'dairy_free']::text[], 'southern', '{"retail_low":0.3,"retail_high":0.8,"restaurant_low":0.9,"restaurant_high":2.4}'::jsonb, '{"calories":35,"protein_g":1,"fat_g":2,"carbs_g":4,"fiber_g":0,"sodium_mg":100,"sugar_g":3}'::jsonb, '/assets/ingredients/chefs-special/bacon-jam.png', false, true
FROM categories WHERE slug = 'chefs-special';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Hot Honey', 'hot-honey', ARRAY['vegetarian', 'gluten_free', 'dairy_free']::text[], 'southern', '{"retail_low":0.15,"retail_high":0.6,"restaurant_low":0.45,"restaurant_high":1.8}'::jsonb, '{"calories":60,"protein_g":0,"fat_g":0,"carbs_g":17,"fiber_g":0,"sodium_mg":0,"sugar_g":17}'::jsonb, '/assets/ingredients/chefs-special/hot-honey.png', false, true
FROM categories WHERE slug = 'chefs-special';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Herb Butter', 'herb-butter', ARRAY['vegetarian', 'gluten_free']::text[], 'neutral', '{"retail_low":0.2,"retail_high":0.7,"restaurant_low":0.6,"restaurant_high":2.1}'::jsonb, '{"calories":100,"protein_g":0,"fat_g":11,"carbs_g":0,"fiber_g":0,"sodium_mg":80,"sugar_g":0}'::jsonb, '/assets/ingredients/chefs-special/herb-butter.png', false, true
FROM categories WHERE slug = 'chefs-special';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Pimento Cheese Spread', 'pimento-cheese-spread', ARRAY['vegetarian', 'gluten_free']::text[], 'southern', '{"retail_low":0.3,"retail_high":0.9,"restaurant_low":0.9,"restaurant_high":2.7}'::jsonb, '{"calories":70,"protein_g":3,"fat_g":6,"carbs_g":1,"fiber_g":0,"sodium_mg":150,"sugar_g":1}'::jsonb, '/assets/ingredients/chefs-special/pimento-cheese-spread.png', false, true
FROM categories WHERE slug = 'chefs-special';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Calabrian Chili Crisp', 'calabrian-chili-crisp', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'italian', '{"retail_low":0.2,"retail_high":0.8,"restaurant_low":0.6,"restaurant_high":2.4}'::jsonb, '{"calories":45,"protein_g":0,"fat_g":4,"carbs_g":2,"fiber_g":0,"sodium_mg":110,"sugar_g":1}'::jsonb, '/assets/ingredients/chefs-special/calabrian-chili-crisp.png', false, true
FROM categories WHERE slug = 'chefs-special';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Toasted Sesame Seeds', 'toasted-sesame-seeds', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'asian_fusion', '{"retail_low":0.05,"retail_high":0.2,"restaurant_low":0.15,"restaurant_high":0.6}'::jsonb, '{"calories":18,"protein_g":1,"fat_g":2,"carbs_g":1,"fiber_g":0,"sodium_mg":1,"sugar_g":0}'::jsonb, '/assets/ingredients/chefs-special/toasted-sesame-seeds.png', false, true
FROM categories WHERE slug = 'chefs-special';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Crispy Shallots', 'crispy-shallots', ARRAY['vegetarian', 'vegan']::text[], 'asian_fusion', '{"retail_low":0.15,"retail_high":0.5,"restaurant_low":0.45,"restaurant_high":1.5}'::jsonb, '{"calories":40,"protein_g":0,"fat_g":3,"carbs_g":4,"fiber_g":0,"sodium_mg":30,"sugar_g":1}'::jsonb, '/assets/ingredients/chefs-special/crispy-shallots.png', false, true
FROM categories WHERE slug = 'chefs-special';

INSERT INTO ingredients (category_id, name, slug, dietary_tags, compat_group, estimated_cost, nutrition, image_asset, is_trigger, enabled)
SELECT id, 'Fig Jam', 'fig-jam', ARRAY['vegetarian', 'vegan', 'gluten_free', 'dairy_free']::text[], 'mediterranean', '{"retail_low":0.15,"retail_high":0.5,"restaurant_low":0.45,"restaurant_high":1.5}'::jsonb, '{"calories":40,"protein_g":0,"fat_g":0,"carbs_g":10,"fiber_g":0,"sodium_mg":5,"sugar_g":8}'::jsonb, '/assets/ingredients/chefs-special/fig-jam.png', false, true
FROM categories WHERE slug = 'chefs-special';
