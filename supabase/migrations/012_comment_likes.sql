ALTER TABLE comments ADD COLUMN like_count INT NOT NULL DEFAULT 0;
ALTER TABLE comments ADD COLUMN reply_count INT NOT NULL DEFAULT 0;

CREATE TABLE comment_likes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_id  UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_comment_likes_user_comment
    ON comment_likes(user_id, comment_id);

CREATE INDEX idx_comment_likes_comment
    ON comment_likes(comment_id);

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comment likes are publicly readable"
    ON comment_likes FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can like comments"
    ON comment_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
    ON comment_likes FOR DELETE
    USING (auth.uid() = user_id);

CREATE FUNCTION adjust_comment_like_count(p_comment_id UUID, p_delta INT)
RETURNS INT
LANGUAGE sql AS $$
    UPDATE comments SET like_count = like_count + p_delta
    WHERE id = p_comment_id
    RETURNING like_count;
$$;

CREATE FUNCTION adjust_comment_reply_count(p_comment_id UUID, p_delta INT)
RETURNS INT
LANGUAGE sql AS $$
    UPDATE comments SET reply_count = reply_count + p_delta
    WHERE id = p_comment_id
    RETURNING reply_count;
$$;

CREATE FUNCTION list_top_level_comments(
    p_target_type TEXT,
    p_target_id UUID,
    p_sort TEXT,
    p_limit INT,
    p_offset INT
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    target_type TEXT,
    target_id UUID,
    parent_id UUID,
    body TEXT,
    like_count INT,
    reply_count INT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE sql STABLE AS $$
    SELECT
        c.id, c.user_id, c.target_type, c.target_id, c.parent_id, c.body,
        c.like_count, c.reply_count, c.created_at, c.updated_at,
        COUNT(*) OVER() AS total_count
    FROM comments c
    WHERE c.target_type = p_target_type
      AND c.target_id = p_target_id
      AND c.parent_id IS NULL
    ORDER BY
        CASE WHEN p_sort = 'oldest' THEN c.created_at END ASC,
        CASE WHEN p_sort = 'newest' THEN c.created_at END DESC,
        CASE WHEN p_sort = 'best' THEN c.like_count END DESC,
        CASE WHEN p_sort = 'hot' THEN
            (c.like_count + c.reply_count)::numeric
            / (EXTRACT(EPOCH FROM (now() - c.created_at)) / 3600 + 2)
        END DESC,
        c.created_at DESC
    LIMIT p_limit OFFSET p_offset
$$;
