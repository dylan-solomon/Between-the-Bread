UPDATE ingredients
SET dietary_tags = array_remove(array_remove(dietary_tags, 'vegan'), 'vegetarian')
WHERE slug IN ('kimchi', 'green-goddess');

UPDATE ingredients
SET dietary_tags = array_append(dietary_tags, 'dairy_free')
WHERE 'vegan' = ANY(dietary_tags)
  AND NOT ('dairy_free' = ANY(dietary_tags));

UPDATE ingredients
SET dietary_tags = array_append(dietary_tags, 'pescatarian')
WHERE ('vegetarian' = ANY(dietary_tags) OR slug IN ('smoked-salmon', 'tuna-salad', 'kimchi', 'green-goddess'))
  AND NOT ('pescatarian' = ANY(dietary_tags));

UPDATE ingredients
SET dietary_tags = array_append(dietary_tags, 'contains_shellfish')
WHERE slug = 'kimchi'
  AND NOT ('contains_shellfish' = ANY(dietary_tags));

UPDATE ingredients
SET dietary_tags = array_append(dietary_tags, 'contains_pork')
WHERE slug IN ('bacon', 'bacon-jam', 'capicola', 'ham', 'mortadella', 'pepperoni', 'prosciutto', 'pulled-pork', 'salami')
  AND NOT ('contains_pork' = ANY(dietary_tags));
