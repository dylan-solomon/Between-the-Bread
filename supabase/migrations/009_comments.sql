CREATE TABLE comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('database', 'community')),
    target_id   UUID NOT NULL,
    parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE,
    body        TEXT NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 500),
    is_flagged  BOOLEAN NOT NULL DEFAULT false,
    is_approved BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_target_created
    ON comments(target_type, target_id, created_at);

CREATE INDEX idx_comments_parent
    ON comments(parent_id)
    WHERE parent_id IS NOT NULL;

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved comments are publicly readable"
    ON comments FOR SELECT
    USING (is_approved = true);

CREATE POLICY "Authenticated users can insert comments"
    ON comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
    ON comments FOR DELETE
    USING (auth.uid() = user_id);
