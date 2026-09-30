CREATE POLICY "Admins can delete photos from storage"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'user-photos' AND is_admin());
