"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Clock3, Copy, Flag, ListOrdered, MessageCircleWarning, Pause, Play, RotateCcw, Trophy, Users } from "lucide-react";
import {
  STORAGE_KEY, acceptAnswer, createGame, expireTurn, getAnswerWarnings,
  getRemainingMs, invalidateLastAnswer, pauseGame, resignCurrentPlayer,
  restoreGame, resumeGame, serializeGame,
  undoLast, validateSettings,
  type GameMode, type GameState, type SettingsErrors, type TurnOrder,
} from "./game";

type PendingAnswer = { answer: string; warnings: string[] };
type Objection = { answer: string; playerName: string; resumeOnClose: boolean };

function formatTime(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function WordGamesPage() {
  const [hydrated, setHydrated] = useState(false);
  const [game, setGame] = useState<GameState | null>(null);
  const [now, setNow] = useState(0);
  const [mode, setMode] = useState<GameMode>("shiritori");
  const [topic, setTopic] = useState("");
  const [turnSeconds, setTurnSeconds] = useState("30");
  const [names, setNames] = useState("");
  const [turnOrder, setTurnOrder] = useState<TurnOrder>("as-entered");
  const [settingsErrors, setSettingsErrors] = useState<SettingsErrors>({});
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState("");
  const [pending, setPending] = useState<PendingAnswer | null>(null);
  const [objection, setObjection] = useState<Objection | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  const answerInput = useRef<HTMLInputElement>(null);
  const objectionDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setGame(restoreGame(window.localStorage.getItem(STORAGE_KEY)));
      setNow(Date.now());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const save = () => {
      if (game) window.localStorage.setItem(STORAGE_KEY, serializeGame(game, Date.now()));
      else window.localStorage.removeItem(STORAGE_KEY);
    };
    save();
    const interval = window.setInterval(save, 1000);
    return () => window.clearInterval(interval);
  }, [game, hydrated]);

  useEffect(() => {
    if (game?.status !== "playing") return;
    const interval = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (game.deadlineAt !== null && currentTime >= game.deadlineAt) {
        setGame((current) => current ? expireTurn(current, currentTime) : null);
        setDraft("");
        setDraftError("");
        setPending(null);
      }
    }, 200);
    return () => window.clearInterval(interval);
  }, [game?.status, game?.deadlineAt]);

  useEffect(() => {
    if (objection && objectionDialog.current && !objectionDialog.current.open) {
      objectionDialog.current.showModal();
    }
  }, [objection]);

  function startGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateSettings(mode, topic, turnSeconds, names, turnOrder);
    setSettingsErrors(result.errors);
    if (!result.settings) return;
    const currentTime = Date.now();
    setNow(currentTime);
    setGame(createGame(result.settings, currentTime));
    setDraft("");
    setPending(null);
  }

  function commitAnswer(answer: string) {
    setGame((current) => current ? acceptAnswer(current, answer, Date.now()) : null);
    setDraft("");
    setDraftError("");
    setPending(null);
    window.requestAnimationFrame(() => answerInput.current?.focus());
  }

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!game || game.status !== "playing" || pending) return;
    const answer = draft.trim();
    if (!answer) { setDraftError("回答を入力してください。"); return; }
    if (getRemainingMs(game, Date.now()) === 0) {
      setGame((current) => current ? expireTurn(current, Date.now()) : null);
      setDraft("");
      return;
    }
    const warnings = getAnswerWarnings(game, answer);
    setDraftError("");
    if (warnings.length) setPending({ answer, warnings });
    else commitAnswer(answer);
  }

  function startNewGame() {
    if (game?.status !== "finished" && !window.confirm("現在のゲームを終了して、新しいゲームを設定しますか？")) return;
    setGame(null);
    setPending(null);
    setDraft("");
    setSettingsErrors({});
  }

  function resign() {
    setGame((current) => current ? resignCurrentPlayer(current, Date.now()) : null);
    setDraft("");
    setDraftError("");
    setPending(null);
    setNow(Date.now());
  }

  function openObjection() {
    const lastMove = game?.moves.at(-1);
    if (!game || game.status === "finished" || lastMove?.type !== "answer") return;
    const currentTime = Date.now();
    if (game.status === "playing" && getRemainingMs(game, currentTime) === 0) {
      setGame(expireTurn(game, currentTime));
      return;
    }
    setGame(pauseGame(game, currentTime));
    setNow(currentTime);
    setCopyMessage("");
    setObjection({
      answer: lastMove.answer,
      playerName: game.players[lastMove.playerId].name,
      resumeOnClose: game.status === "playing",
    });
  }

  function resolveObjection(invalid: boolean) {
    if (!objection) return;
    const currentTime = Date.now();
    setGame((current) => current
      ? invalid
        ? invalidateLastAnswer(current, currentTime, objection.resumeOnClose)
        : objection.resumeOnClose ? resumeGame(current, currentTime) : current
      : null,
    );
    if (invalid) {
      setDraft("");
      setDraftError("");
      setPending(null);
    }
    setNow(currentTime);
    setObjection(null);
  }

  async function copyObjectionAnswer() {
    if (!objection) return;
    try {
      await navigator.clipboard.writeText(objection.answer);
      setCopyMessage("回答をコピーしました。");
    } catch {
      setCopyMessage("コピーできませんでした。回答を選択してコピーしてください。");
    }
  }

  const activePlayer = game?.players.find((player) => player.id === game.currentPlayerId);
  const remainingMs = game ? Math.min(game.turnSeconds * 1000, getRemainingMs(game, now)) : 0;
  const isUrgent = game?.status === "playing" && remainingMs <= 10000;
  const progress = game ? Math.min(100, Math.max(0, remainingMs / (game.turnSeconds * 10))) : 0;
  const lastMove = game?.moves.at(-1);
  const canObject = game?.status !== "finished" && lastMove?.type === "answer";
  const card = "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-neutral-900";
  const field = "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-50 dark:border-neutral-700";
  const secondaryButton = "rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/" className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">← ツール一覧へ</Link>
      <div className="mt-7 mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">しりとり・山手線ゲーム</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">コメントの回答を入力して、手番と制限時間を管理できます。</p>
      </div>

      {!hydrated ? <p className="text-sm text-neutral-500">ゲームを読み込んでいます…</p> : !game ? (
        <form onSubmit={startGame} noValidate className={`${card} max-w-2xl space-y-6`}>
          <div><h2 className="text-xl font-semibold">ゲームの設定</h2><p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">ゲームの種類、参加者、手番の順番を決めてください。</p></div>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">ゲームの種類</legend>
            <div className="grid grid-cols-2 gap-3">
              {(["shiritori", "yamanote"] as const).map((value) => (
                <label key={value} className={`cursor-pointer rounded-xl border px-4 py-3 text-center text-sm font-semibold transition focus-within:ring-2 focus-within:ring-blue-500 ${mode === value ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200" : "border-neutral-200 hover:border-blue-300 dark:border-neutral-700"}`}>
                  <input type="radio" name="mode" checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
                  {value === "shiritori" ? "しりとり" : "山手線ゲーム"}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="topic" className="mb-2 block text-sm font-semibold">お題 {mode === "shiritori" && <span className="font-normal text-neutral-500">（任意）</span>}</label>
            <input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder={mode === "shiritori" ? "例：食べ物（空欄なら自由）" : "例：山手線の駅名"} aria-invalid={!!settingsErrors.topic} aria-describedby={settingsErrors.topic ? "topic-error" : undefined} className={field} />
            {settingsErrors.topic && <p id="topic-error" className="mt-1 text-sm text-red-600">{settingsErrors.topic}</p>}
          </div>
          <div>
            <label htmlFor="turn-seconds" className="mb-2 block text-sm font-semibold">一手の制限時間（秒）</label>
            <input id="turn-seconds" type="number" min="1" max="3600" step="1" value={turnSeconds} onChange={(event) => setTurnSeconds(event.target.value)} aria-invalid={!!settingsErrors.turnSeconds} aria-describedby={settingsErrors.turnSeconds ? "seconds-error" : undefined} className={field} />
            {settingsErrors.turnSeconds && <p id="seconds-error" className="mt-1 text-sm text-red-600">{settingsErrors.turnSeconds}</p>}
          </div>
          <div>
            <label htmlFor="player-names" className="mb-2 block text-sm font-semibold">参加者一覧</label>
            <textarea id="player-names" rows={5} value={names} onChange={(event) => setNames(event.target.value)} placeholder={"りんごさん\nごりらさん"} aria-invalid={!!settingsErrors.names} aria-describedby={settingsErrors.names ? "names-error" : "names-help"} className={field} />
            <p id="names-help" className="mt-1 text-xs text-neutral-500">1行に1人ずつ入力してください。</p>
            {settingsErrors.names && <p id="names-error" className="mt-1 text-sm text-red-600">{settingsErrors.names}</p>}
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">参加者の順番</legend>
            <div className="grid grid-cols-2 gap-3">
              {(["as-entered", "random"] as const).map((value) => (
                <label key={value} className={`cursor-pointer rounded-xl border px-4 py-3 text-center text-sm font-semibold transition focus-within:ring-2 focus-within:ring-blue-500 ${turnOrder === value ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200" : "border-neutral-200 hover:border-blue-300 dark:border-neutral-700"}`}>
                  <input type="radio" name="turn-order" checked={turnOrder === value} onChange={() => setTurnOrder(value)} className="sr-only" />
                  {value === "as-entered" ? "入力した順" : "ランダム"}
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">ゲームを開始</button>
        </form>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="space-y-6">
            <section className={card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-semibold text-blue-700 dark:text-blue-400">{game.mode === "shiritori" ? "しりとり" : "山手線ゲーム"}</p><h2 className="mt-1 text-xl font-bold">お題：{game.topic || "自由"}</h2></div>
                <button type="button" onClick={startNewGame} className={secondaryButton}>新しいゲーム</button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-blue-50 p-5 dark:bg-blue-950/40">
                  <p className="text-sm text-blue-800 dark:text-blue-300">{game.status === "finished" ? "勝者" : "現在の手番"}</p>
                  <p className="mt-2 text-2xl font-bold">{game.status === "finished" && <Trophy aria-hidden="true" className="mr-2 inline size-6 text-amber-500" />}{activePlayer?.name ?? "—"}</p>
                </div>
                <div className="rounded-xl bg-neutral-100 p-5 dark:bg-neutral-800">
                  <p className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300"><Clock3 aria-hidden="true" className="size-4" />残り時間</p>
                  <p role="timer" aria-live="off" className={`mt-1 font-mono text-3xl font-bold tabular-nums ${isUrgent ? "text-red-600 dark:text-red-400" : ""}`}>{formatTime(remainingMs)}</p>
                  <p className="mt-1 text-xs text-neutral-500">一手 {game.turnSeconds} 秒{game.status === "paused" ? " · 一時停止中" : ""}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"><div className={`h-full transition-[width] duration-200 ${isUrgent ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${progress}%` }} /></div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {game.status !== "finished" && <button type="button" onClick={() => setGame((current) => current ? current.status === "playing" ? pauseGame(current, Date.now()) : resumeGame(current, Date.now()) : null)} className={`inline-flex items-center gap-2 ${secondaryButton}`}>{game.status === "playing" ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}{game.status === "playing" ? "一時停止" : "再開"}</button>}
                <button type="button" disabled={!game.undo} onClick={() => { setGame((current) => current ? undoLast(current) : null); setPending(null); setDraft(""); }} className={`inline-flex items-center gap-2 ${secondaryButton}`}><RotateCcw aria-hidden="true" className="size-4" />直前の手を取り消す</button>
                {game.status !== "finished" && <button type="button" disabled={!canObject} onClick={openObjection} className={`inline-flex items-center gap-2 ${secondaryButton}`}><MessageCircleWarning aria-hidden="true" className="size-4" />物言い</button>}
                {game.status !== "finished" && <button type="button" onClick={resign} className={`inline-flex items-center gap-2 ${secondaryButton} text-red-700 dark:text-red-400`}><Flag aria-hidden="true" className="size-4" />投了</button>}
              </div>
            </section>

            {game.status !== "finished" && <section className={card}>
              <h2 className="text-lg font-semibold">回答を入力</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{activePlayer?.name}の回答を入力してください。お題との一致は配信者が確認してください。</p>
              <form onSubmit={submitAnswer} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <label htmlFor="answer" className="sr-only">現在のプレイヤーの回答</label>
                  <input ref={answerInput} id="answer" value={draft} onChange={(event) => { setDraft(event.target.value); setDraftError(""); }} disabled={game.status !== "playing" || !!pending} placeholder="回答を入力" autoComplete="off" aria-invalid={!!draftError} aria-describedby={draftError ? "answer-error" : undefined} className={field} />
                  {draftError && <p id="answer-error" className="mt-1 text-sm text-red-600">{draftError}</p>}
                </div>
                <button type="submit" disabled={game.status !== "playing" || !!pending} className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">回答を確定</button>
              </form>
              {pending && <div role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
                <p className="font-semibold text-amber-900 dark:text-amber-200">「{pending.answer}」を確認してください</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-amber-900 dark:text-amber-200">{pending.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={game.status !== "playing"} onClick={() => commitAnswer(pending.answer)} className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50">採用して次へ</button>
                  <button type="button" onClick={() => { setPending(null); window.requestAnimationFrame(() => answerInput.current?.focus()); }} className="rounded-lg border border-amber-500 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900">修正する</button>
                </div>
              </div>}
            </section>}

            <section className={card}>
              <h2 className="flex items-center gap-2 text-lg font-semibold"><ListOrdered aria-hidden="true" className="size-5" />着手リスト</h2>
              {game.moves.length === 0 ? <p className="mt-4 text-sm text-neutral-500">まだ回答はありません。</p> : <ol className="mt-4 max-h-96 space-y-2 overflow-y-auto">
                {game.moves.map((move, index) => <li key={index} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2.5 text-sm dark:bg-neutral-800">
                  <span><span className="mr-2 font-mono text-neutral-500">{index + 1}:</span><span className={move.type === "answer" ? "font-medium" : "font-medium text-red-600 dark:text-red-400"}>{move.type === "answer" ? move.answer : move.type === "timeout" ? "時間切れ・脱落" : "投了・脱落"}</span></span>
                  <span className="text-xs text-neutral-500">{game.players[move.playerId]?.name}</span>
                </li>)}
              </ol>}
            </section>
          </div>

          <aside className={card}>
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Users aria-hidden="true" className="size-5" />参加者一覧</h2>
            <ol className="mt-4 space-y-2">{game.players.map((player, index) => <li key={player.id} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm ${player.id === game.currentPlayerId && game.status !== "finished" ? "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-200" : "bg-neutral-50 dark:bg-neutral-800"}`}>
              <span className={player.eliminated ? "text-neutral-400 line-through" : "font-medium"}>{index + 1}. {player.name}</span>
              <span className={`shrink-0 text-xs ${player.eliminated ? "text-red-600 dark:text-red-400" : "text-neutral-500"}`}>{player.eliminated ? "脱落" : player.id === game.currentPlayerId && game.status !== "finished" ? "手番" : "参加中"}</span>
            </li>)}</ol>
          </aside>
        </div>
      )}
      {objection && (
        <dialog
          ref={objectionDialog}
          aria-labelledby="objection-title"
          onCancel={(event) => { event.preventDefault(); resolveObjection(false); }}
          className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-900 shadow-xl backdrop:bg-black/60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        >
          <h2 id="objection-title" className="text-xl font-bold">物言い</h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">制限時間を止めています。直前の回答を確認してください。</p>
          <div className="mt-5 rounded-xl bg-neutral-100 p-4 dark:bg-neutral-800">
            <p className="text-xs text-neutral-500">{objection.playerName}の直前の手</p>
            <p className="mt-2 select-text break-all text-lg font-semibold">{objection.answer}</p>
            <button type="button" onClick={copyObjectionAnswer} className={`mt-3 inline-flex items-center gap-2 ${secondaryButton}`}><Copy aria-hidden="true" className="size-4" />回答をコピー</button>
            {copyMessage && <p role="status" className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">{copyMessage}</p>}
          </div>
          <p className="mt-5 text-sm text-neutral-600 dark:text-neutral-400">「不正」を選ぶと、この回答を取り消し、回答者を脱落させます。</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => resolveObjection(false)} className={secondaryButton}>問題なし</button>
            <button type="button" onClick={() => resolveObjection(true)} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">不正</button>
          </div>
        </dialog>
      )}
    </main>
  );
}
