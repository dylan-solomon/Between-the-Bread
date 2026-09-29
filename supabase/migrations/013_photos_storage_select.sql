CREATE POLICY "Approved photos are publicly readable in storage"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'user-photos'
        AND EXISTS (
            SELECT 1 FROM photos
            WHERE photos.storage_path = storage.objects.name
              AND photos.is_approved = true
        )
    );
