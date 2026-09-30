import Link from "next/link";
import { Suspense } from "react";
import { neon } from "@neondatabase/serverless";
import { ArrowUpRight, Dices, MessageCircleMore, MessagesSquare } from "lucide-react";
import { connection } from "next/server";

const tools = [
  {
    href: "/word-games",
    title: "しりとり・山手線ゲーム",
    description: "言葉をつないで遊ぶゲームツール",
    icon: MessagesSquare,
    iconClassName: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
  {
    href: "/lottery",
    title: "抽選ツール",
    description: "候補をランダムに抽出・並び替え",
    icon: Dices,
    iconClassName: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    href: "/chao-chat",
    title: "ちゃおチャット",
    description: "気軽に書き込める匿名掲示板",
    icon: MessageCircleMore,
    iconClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
];

async function UpdateHistory() {
  await connection();
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!databaseUrl) return <p className="mt-4 text-sm text-neutral-500">更新履歴を表示できません。</p>;

  let entries: { id: string; date: string; summary: string }[] | null = null;
  try {
    const sql = neon(databaseUrl);
    const rows = await sql`
      SELECT id::text AS id, published_on::text AS date, summary
      FROM changelog_entries
      ORDER BY published_on DESC, id DESC
      LIMIT 8
    `;
    entries = rows.map((row) => ({ id: String(row.id), date: String(row.date), summary: String(row.summary) }));
  } catch {
    // Keep the tool list available if the database cannot be reached.
  }

  if (!entries) return <p className="mt-4 text-sm text-neutral-500">更新履歴を読み込めませんでした。</p>;
  if (entries.length === 0) return <p className="mt-4 text-sm text-neutral-500">更新履歴はまだありません。</p>;
  return (
    <ul className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:gap-5">
          <time dateTime={entry.date} className="shrink-0 text-neutral-500">{entry.date.replaceAll("-", ".")}</time>
          <span>{entry.summary}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">ツール一覧</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          使いたいツールを選んでください。
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map(({ href, title, description, icon: Icon, iconClassName }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-52 flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-blue-500"
          >
            <span className={`flex size-14 items-center justify-center rounded-xl ${iconClassName}`}>
              <Icon aria-hidden="true" className="size-7" strokeWidth={1.8} />
            </span>
            <div className="mt-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {description}
                </p>
              </div>
              <ArrowUpRight
                aria-hidden="true"
                className="mt-1 size-5 shrink-0 text-neutral-400 transition group-hover:text-blue-600 dark:group-hover:text-blue-400"
              />
            </div>
          </Link>
        ))}
      </div>
      <section aria-labelledby="updates-title" className="mt-12 border-t border-neutral-200 pt-8 dark:border-neutral-800">
        <h2 id="updates-title" className="text-xl font-bold">更新履歴</h2>
        <Suspense fallback={<p className="mt-4 text-sm text-neutral-500">読み込み中…</p>}>
          <UpdateHistory />
        </Suspense>
      </section>
    </main>
  );
}
