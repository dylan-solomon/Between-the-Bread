INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('sandwich-images', 'sandwich-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Sandwich images are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'sandwich-images');

CREATE POLICY "Admins can upload sandwich images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'sandwich-images' AND is_admin());

CREATE POLICY "Admins can delete sandwich images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'sandwich-images' AND is_admin());
