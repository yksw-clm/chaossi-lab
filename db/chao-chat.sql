CREATE TABLE IF NOT EXISTS chao_chat_posts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author varchar(24) NOT NULL,
  body varchar(1000) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chao_chat_posts_author_not_blank CHECK (length(trim(author)) > 0),
  CONSTRAINT chao_chat_posts_body_not_blank CHECK (length(trim(body)) > 0)
);

CREATE TABLE IF NOT EXISTS chao_chat_rate_limits (
  identity_hash char(64) PRIMARY KEY,
  last_posted_at timestamptz NOT NULL
);
