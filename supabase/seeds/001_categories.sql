INSERT INTO categories (name, slug, display_order, selection_type, min_picks, max_picks, emoji, color, has_double_toggle, is_bonus)
VALUES
    ('Bread',          'bread',        1, 'single', 1, 1, '🍞', '#D4A056', false, false),
    ('Protein',        'protein',      2, 'single', 1, 1, '🥩', '#C0392B', true,  false),
    ('Cheese',         'cheese',       3, 'single', 1, 1, '🧀', '#F4D03F', true,  false),
    ('Toppings',       'toppings',     4, 'multi',  1, 4, '🥬', '#27AE60', false, false),
    ('Condiments',     'condiments',   5, 'multi',  1, 2, '🫙', '#E67E22', false, false),
    ('Chef''s Special', 'chefs-special', 6, 'single', 1, 1, '👨‍🍳', '#8E44AD', false, true);
