import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL または POSTGRES_URL が設定されていません。");
  process.exit(1);
}

const sql = neon(databaseUrl);
const schema = await readFile(new URL("../db/chao-chat.sql", import.meta.url), "utf8");

try {
  for (const statement of schema.split(";").map((part) => part.trim()).filter(Boolean)) {
    await sql.query(statement);
  }

  const rows = await sql`
    SELECT
      to_regclass('public.chao_chat_posts') IS NOT NULL AS posts_ready,
      to_regclass('public.chao_chat_rate_limits') IS NOT NULL AS rate_limits_ready
  `;
  if (!rows[0]?.posts_ready || !rows[0]?.rate_limits_ready) {
    throw new Error("missing tables");
  }

  console.log("ちゃおチャットのテーブルを確認しました。DB 接続は正常です。");
} catch (error) {
  const category = error instanceof Error ? error.name : "UnknownError";
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "unknown";
  let details = error instanceof Error ? error.message : "";
  try {
    const parsed = new URL(databaseUrl);
    for (const secret of [databaseUrl, parsed.username, parsed.password, parsed.hostname]) {
      if (secret) details = details.replaceAll(secret, "[伏せ字]");
    }
  } catch {
    details = details.replaceAll(databaseUrl, "[伏せ字]");
  }
  details = details.replace(/(?:postgres(?:ql)?|https?):\/\/\S+/gi, "[接続先]");
  console.error(`DB 接続またはテーブル作成に失敗しました（${category} / ${code}）。${details.slice(0, 300)}`);
  process.exitCode = 1;
}
