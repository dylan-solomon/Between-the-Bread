-- Self-affinities (every group pairs perfectly with itself)
INSERT INTO compat_matrix (group_a, group_b, affinity) VALUES
    ('american',      'american',      1.00),
    ('asian_fusion',  'asian_fusion',  1.00),
    ('deli_classic',  'deli_classic',  1.00),
    ('italian',       'italian',       1.00),
    ('mediterranean', 'mediterranean', 1.00),
    ('neutral',       'neutral',       1.00),
    ('southern',      'southern',      1.00),
    ('tex_mex',       'tex_mex',       1.00);

-- Cross-group affinities (stored with group_a < group_b alphabetically)
-- The API layer handles lookups in both directions.
INSERT INTO compat_matrix (group_a, group_b, affinity) VALUES
    ('american',      'asian_fusion',  0.20),
    ('american',      'deli_classic',  0.80),
    ('american',      'italian',       0.50),
    ('american',      'mediterranean', 0.30),
    ('american',      'neutral',       0.70),
    ('american',      'southern',      0.80),
    ('american',      'tex_mex',       0.70),
    ('asian_fusion',  'deli_classic',  0.20),
    ('asian_fusion',  'italian',       0.20),
    ('asian_fusion',  'mediterranean', 0.40),
    ('asian_fusion',  'neutral',       0.60),
    ('asian_fusion',  'southern',      0.20),
    ('asian_fusion',  'tex_mex',       0.40),
    ('deli_classic',  'italian',       0.50),
    ('deli_classic',  'mediterranean', 0.40),
    ('deli_classic',  'neutral',       0.70),
    ('deli_classic',  'southern',      0.50),
    ('deli_classic',  'tex_mex',       0.30),
    ('italian',       'mediterranean', 0.85),
    ('italian',       'neutral',       0.70),
    ('italian',       'southern',      0.30),
    ('italian',       'tex_mex',       0.30),
    ('mediterranean', 'neutral',       0.70),
    ('mediterranean', 'southern',      0.20),
    ('mediterranean', 'tex_mex',       0.20),
    ('neutral',       'southern',      0.70),
    ('neutral',       'tex_mex',       0.60),
    ('southern',      'tex_mex',       0.60);
