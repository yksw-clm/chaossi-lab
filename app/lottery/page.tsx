import Link from "next/link";

export default function LotteryPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <Link href="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← ツール一覧へ
      </Link>
      <h1 className="mt-8 text-3xl font-bold">抽選ツール</h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-400">このツールは準備中です。</p>
    </main>
  );
}
