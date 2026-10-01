CREATE TABLE blog_categories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    name          TEXT NOT NULL,
    description   TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO blog_categories (slug, name, display_order) VALUES
    ('sandwich-ideas', 'Sandwich Ideas', 1),
    ('best-pairings', 'Best Pairings', 2),
    ('techniques-and-guides', 'Techniques and Guides', 3),
    ('dietary', 'Dietary', 4)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE blog_posts (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                  TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    title                 TEXT NOT NULL,
    excerpt               TEXT NOT NULL DEFAULT '',
    body                  TEXT NOT NULL DEFAULT '',
    cover_image_url       TEXT,
    related_sandwich_slugs TEXT[] NOT NULL DEFAULT '{}',
    author_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name           TEXT NOT NULL DEFAULT '',
    meta_description      TEXT,
    reading_time_minutes  INTEGER NOT NULL DEFAULT 1,
    published             BOOLEAN NOT NULL DEFAULT false,
    published_at          TIMESTAMPTZ,
    search_vector         TSVECTOR,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_posts_search
    ON blog_posts USING GIN(search_vector);

CREATE INDEX idx_blog_posts_published_at
    ON blog_posts(published_at DESC)
    WHERE published = true;

CREATE INDEX idx_blog_posts_related_sandwiches
    ON blog_posts USING GIN(related_sandwich_slugs);

CREATE OR REPLACE FUNCTION blog_posts_search_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_posts_search_trigger
    BEFORE INSERT OR UPDATE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION blog_posts_search_update();

CREATE TABLE blog_post_categories (
    post_id     UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES blog_categories(id) ON DELETE RESTRICT,
    PRIMARY KEY (post_id, category_id)
);

CREATE INDEX idx_blog_post_categories_category
    ON blog_post_categories(category_id);

ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blog categories are publicly readable"
    ON blog_categories FOR SELECT
    USING (true);

CREATE POLICY "Admins can insert blog categories"
    ON blog_categories FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update blog categories"
    ON blog_categories FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Admins can delete blog categories"
    ON blog_categories FOR DELETE
    USING (is_admin());

CREATE POLICY "Live blog posts are publicly readable"
    ON blog_posts FOR SELECT
    USING (published = true AND published_at <= now());

CREATE POLICY "Admins can read all blog posts"
    ON blog_posts FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can insert blog posts"
    ON blog_posts FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update blog posts"
    ON blog_posts FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Admins can delete blog posts"
    ON blog_posts FOR DELETE
    USING (is_admin());

CREATE POLICY "Categories of live posts are publicly readable"
    ON blog_post_categories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM blog_posts p
            WHERE p.id = blog_post_categories.post_id
              AND p.published = true
              AND p.published_at <= now()
        )
    );

CREATE POLICY "Admins can read all blog post categories"
    ON blog_post_categories FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can insert blog post categories"
    ON blog_post_categories FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can delete blog post categories"
    ON blog_post_categories FOR DELETE
    USING (is_admin());

CREATE OR REPLACE FUNCTION replace_blog_post_categories(p_post_id UUID, p_category_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public AS $$
BEGIN
    DELETE FROM blog_post_categories WHERE post_id = p_post_id;
    INSERT INTO blog_post_categories (post_id, category_id)
    SELECT p_post_id, category_id FROM unnest(p_category_ids) AS category_id;
END;
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('blog-images', 'blog-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Blog images are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'blog-images');

CREATE POLICY "Admins can upload blog images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'blog-images' AND is_admin());

CREATE POLICY "Admins can delete blog images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'blog-images' AND is_admin());
