import Link from "next/link";
import { MessageCircleMore } from "lucide-react";
import { Board } from "./board";

export default function ChaoChatPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/" className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">← ツール一覧へ</Link>
      <div className="mt-7 mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl"><MessageCircleMore aria-hidden="true" className="size-8 text-emerald-600" />ちゃおチャット</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">名前を決めずに参加できる、気軽な掲示板です。投稿は新しい順に表示します。</p>
      </div>
      <Board />
    </main>
  );
}
