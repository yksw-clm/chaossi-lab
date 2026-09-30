CREATE TABLE IF NOT EXISTS changelog_entries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entry_key text NOT NULL UNIQUE,
  published_on date NOT NULL,
  summary varchar(200) NOT NULL,
  CONSTRAINT changelog_entries_summary_not_blank CHECK (length(trim(summary)) > 0)
);

INSERT INTO changelog_entries (entry_key, published_on, summary) VALUES
  ('word-games-2026-09-27', '2026-09-27', 'しりとり・山手線ゲームを追加'),
  ('lottery-2026-09-27', '2026-09-27', '抽選ツールを追加'),
  ('chao-chat-2026-09-27', '2026-09-27', 'ちゃおチャットを追加'),
  ('changelog-2026-09-30', '2026-09-30', 'ツール一覧に更新履歴を追加'),
  ('cpod-beta-2026-09-30', '2026-09-30', '体罰の定義（β）へのリンクを追加')
ON CONFLICT (entry_key) DO NOTHING;
