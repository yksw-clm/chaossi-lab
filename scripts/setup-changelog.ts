import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL または POSTGRES_URL が設定されていません。");
  process.exit(1);
}

const sql = neon(databaseUrl);
const schema = await readFile(new URL("../db/changelog.sql", import.meta.url), "utf8");

try {
  for (const statement of schema.split(";").map((part) => part.trim()).filter(Boolean)) {
    await sql.query(statement);
  }

  const rows = await sql`SELECT count(*)::int AS count FROM changelog_entries`;
  console.log(`更新履歴テーブルを確認しました（${rows[0]?.count ?? 0}件）。`);
} catch (error) {
  const category = error instanceof Error ? error.name : "UnknownError";
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "unknown";
  console.error(`更新履歴テーブルの作成に失敗しました（${category} / ${code}）。接続先と権限を確認してください。`);
  process.exitCode = 1;
}
