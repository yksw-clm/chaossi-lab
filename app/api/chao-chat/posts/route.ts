import { createHmac } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { createPosterId, posterIdCookie, readPosterId } from "@/app/chao-chat/poster-id";
import { validatePost } from "@/app/chao-chat/validation";

export const runtime = "nodejs";

const PAGE_SIZE = 20;

function databaseUrl() {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
}

function unavailable() {
  return Response.json(
    { error: "掲示板のデータベースが未設定です。管理者が Neon を接続すると利用できます。" },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  const url = databaseUrl();
  if (!url) return unavailable();

  const cursor = new URL(request.url).searchParams.get("cursor");
  if (cursor !== null && (!/^[1-9]\d{0,18}$/.test(cursor) || BigInt(cursor) > BigInt("9223372036854775807"))) {
    return Response.json({ error: "ページ指定が正しくありません。" }, { status: 400 });
  }

  try {
    const sql = neon(url);
    const rows = cursor
      ? await sql`SELECT id::text AS id, author, poster_id AS "posterId", body, created_at AS "createdAt"
          FROM chao_chat_posts WHERE id < ${cursor}::bigint
          ORDER BY id DESC LIMIT ${PAGE_SIZE + 1}`
      : await sql`SELECT id::text AS id, author, poster_id AS "posterId", body, created_at AS "createdAt"
          FROM chao_chat_posts ORDER BY id DESC LIMIT ${PAGE_SIZE + 1}`;

    const posts = rows.slice(0, PAGE_SIZE).map((row) => ({
      id: String(row.id),
      author: String(row.author),
      posterId: String(row.posterId),
      body: String(row.body),
      createdAt: new Date(String(row.createdAt)).toISOString(),
    }));
    const nextCursor = rows.length > PAGE_SIZE ? posts.at(-1)?.id ?? null : null;

    return Response.json({ posts, nextCursor }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to load chao chat posts", error);
    return Response.json({ error: "投稿を読み込めませんでした。時間をおいて再試行してください。" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const url = databaseUrl();
  if (!url) return unavailable();

  if ((Number(request.headers.get("content-length")) || 0) > 4096) {
    return Response.json({ error: "投稿内容が長すぎます。" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "投稿内容を確認してください。" }, { status: 400 });
  }

  const post = validatePost(payload);
  if (!post.ok) return Response.json({ error: post.error }, { status: 400 });

  const savedPosterId = readPosterId(request.headers.get("cookie"));
  const posterId = savedPosterId ?? createPosterId();

  const ip = request.headers.get("x-vercel-forwarded-for")
    ?? request.headers.get("x-forwarded-for")
    ?? "local";
  const identityHash = createHmac("sha256", url).update(ip).digest("hex");

  try {
    const sql = neon(url);
    const rows = await sql`
      WITH permit AS (
        INSERT INTO chao_chat_rate_limits (identity_hash, last_posted_at)
        VALUES (${identityHash}, now())
        ON CONFLICT (identity_hash) DO UPDATE
          SET last_posted_at = EXCLUDED.last_posted_at
          WHERE chao_chat_rate_limits.last_posted_at <= now() - interval '30 seconds'
        RETURNING identity_hash
      )
      INSERT INTO chao_chat_posts (author, poster_id, body)
      SELECT ${post.author}, ${posterId}, ${post.body} FROM permit
      RETURNING id::text AS id
    `;

    if (rows.length === 0) {
      return Response.json(
        { error: "連続投稿はできません。30秒ほど待ってください。" },
        { status: 429, headers: { "Retry-After": "30" } },
      );
    }
    return Response.json(
      { id: String(rows[0].id) },
      { status: 201, headers: savedPosterId ? undefined : { "Set-Cookie": posterIdCookie(posterId, process.env.NODE_ENV === "production") } },
    );
  } catch (error) {
    console.error("Failed to save chao chat post", error);
    return Response.json({ error: "投稿を保存できませんでした。時間をおいて再試行してください。" }, { status: 500 });
  }
}
