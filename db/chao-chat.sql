CREATE TABLE IF NOT EXISTS chao_chat_posts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author varchar(24) NOT NULL,
  poster_id varchar(12) NOT NULL,
  body varchar(1000) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chao_chat_posts_author_not_blank CHECK (length(trim(author)) > 0),
  CONSTRAINT chao_chat_posts_body_not_blank CHECK (length(trim(body)) > 0)
);

ALTER TABLE chao_chat_posts ADD COLUMN IF NOT EXISTS poster_id varchar(12);
UPDATE chao_chat_posts
SET poster_id = upper(substr(md5('legacy:' || id::text), 1, 12))
WHERE poster_id IS NULL;
ALTER TABLE chao_chat_posts ALTER COLUMN poster_id SET NOT NULL;

CREATE TABLE IF NOT EXISTS chao_chat_rate_limits (
  identity_hash char(64) PRIMARY KEY,
  last_posted_at timestamptz NOT NULL
);
