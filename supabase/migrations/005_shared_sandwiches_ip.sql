ALTER TABLE shared_sandwiches ADD COLUMN created_by_ip TEXT;

CREATE INDEX idx_shared_sandwiches_ip_created
    ON shared_sandwiches(created_by_ip, created_at)
    WHERE created_by_ip IS NOT NULL;
