CREATE TABLE photos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type  TEXT NOT NULL CHECK (target_type IN ('database', 'community')),
    target_id    UUID NOT NULL,
    storage_path TEXT NOT NULL,
    caption      TEXT CHECK (caption IS NULL OR char_length(caption) <= 100),
    is_approved  BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_photos_target
    ON photos(target_type, target_id, created_at DESC)
    WHERE is_approved = true;

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved photos are publicly readable"
    ON photos FOR SELECT
    USING (is_approved = true);

CREATE POLICY "Authenticated users can insert photos"
    ON photos FOR INSERT
    WITH CHECK (auth.uid() = user_id);
