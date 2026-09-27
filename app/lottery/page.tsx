"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Dices, ListOrdered, Shuffle, Trash2 } from "lucide-react";
import { drawCandidates, parseCandidates } from "./lottery";

const CANDIDATES_STORAGE_KEY = "chaossi-lab:lottery:candidates";

export default function LotteryPage() {
  const [input, setInput] = useState("");
  const [countInput, setCountInput] = useState("1");
  const [result, setResult] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const candidates = useMemo(() => parseCandidates(input), [input]);
  const count = Number(countInput);
  const isReorder = candidates.length > 0 && count === candidates.length;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setInput(window.localStorage.getItem(CANDIDATES_STORAGE_KEY) ?? "");
      } catch {
        // The list remains usable when browser storage is unavailable.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function updateCandidates(value: string) {
    setInput(value);
    setResult(null);
    setError("");
    try {
      if (value) window.localStorage.setItem(CANDIDATES_STORAGE_KEY, value);
      else window.localStorage.removeItem(CANDIDATES_STORAGE_KEY);
    } catch {
      // The list remains usable when browser storage is unavailable.
    }
  }

  function clearCandidates() {
    updateCandidates("");
  }

  function runLottery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (candidates.length === 0) {
      setError("候補を1件以上入力してください。");
      setResult(null);
      return;
    }
    if (!Number.isInteger(count) || count < 1 || count > candidates.length) {
      setError(`抽出件数は1〜${candidates.length}件の整数で入力してください。`);
      setResult(null);
      return;
    }
    setError("");
    setResult(drawCandidates(candidates, count));
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/" className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">← ツール一覧へ</Link>
      <div className="mt-7 mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl"><Dices aria-hidden="true" className="size-8 text-amber-600" />抽選ツール</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">候補から好きな件数をランダムに選びます。全件を選ぶと、順番をランダムに並び替えます。</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <form onSubmit={runLottery} noValidate className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div>
            <label htmlFor="candidates" className="block text-lg font-semibold">候補リスト</label>
            <p id="candidates-help" className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">1行に1件ずつ入力してください。同じ内容も別の候補として数えます。</p>
            <textarea
              id="candidates"
              rows={9}
              value={input}
              onChange={(event) => updateCandidates(event.target.value)}
              placeholder={"A\nB\nC\nD\nE\nF"}
              aria-invalid={error.startsWith("候補")}
              aria-describedby={error.startsWith("候補") ? "candidates-help lottery-error" : "candidates-help"}
              className="mt-3 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700"
            />
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="text-sm text-neutral-500">候補数：{candidates.length}件 · ブラウザに自動保存</p>
              <button type="button" onClick={clearCandidates} disabled={!input} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400"><Trash2 aria-hidden="true" className="size-4" />全削除</button>
            </div>
          </div>

          <div>
            <label htmlFor="draw-count" className="block text-lg font-semibold">抽出件数</label>
            <p id="count-help" className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">1〜{candidates.length || "候補数"}件を指定できます。</p>
            <input
              id="draw-count"
              type="number"
              min="1"
              max={Math.max(1, candidates.length)}
              step="1"
              value={countInput}
              onChange={(event) => { setCountInput(event.target.value); setResult(null); setError(""); }}
              aria-invalid={error.startsWith("抽出件数")}
              aria-describedby={error.startsWith("抽出件数") ? "count-help lottery-error" : "count-help"}
              className="mt-3 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700"
            />
            {isReorder && <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-300"><Shuffle aria-hidden="true" className="size-4" />全件をランダムに並び替えます。</p>}
          </div>

          {error && <p id="lottery-error" role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
          <button type="submit" className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            {isReorder ? "並び替える" : "抽選する"}
          </button>
        </form>

        <section aria-live="polite" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><ListOrdered aria-hidden="true" className="size-5" />{result ? result.length === candidates.length ? "並び替え結果" : "抽選結果" : "結果"}</h2>
          {result ? (
            <ol className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto">
              {result.map((candidate, index) => (
                <li key={index} className="flex items-center gap-3 rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-900 dark:bg-amber-800 dark:text-amber-100">{index + 1}</span>
                  <span className="min-w-0 break-words font-medium">{candidate}</span>
                </li>
              ))}
            </ol>
          ) : <p className="mt-4 text-sm text-neutral-500">候補と件数を設定して、抽選してください。</p>}
        </section>
      </div>
    </main>
  );
}
