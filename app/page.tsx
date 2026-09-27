import Link from "next/link";
import { ArrowUpRight, MessagesSquare } from "lucide-react";

const tools = [
  {
    href: "/word-games",
    title: "しりとり・山手線ゲーム",
    description: "言葉をつないで遊ぶゲームツール",
    icon: MessagesSquare,
    iconClassName: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
];

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
    </main>
  );
}
