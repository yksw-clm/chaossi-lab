"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, RefreshCw, Send } from "lucide-react";
import { MAX_AUTHOR_LENGTH, MAX_BODY_LENGTH } from "./validation";

type Post = { id: string; author: string; posterId: string; body: string; createdAt: string };
type PostPage = { posts: Post[]; nextCursor: string | null };

const endpoint = "/api/chao-chat/posts";
const REFRESH_INTERVAL_MS = 10_000;
const AUTHOR_STORAGE_KEY = "chaossi-lab:chao-chat:author";

async function responseError(response: Response): Promise<string> {
  const data = await response.json().catch(() => null);
  return typeof data?.error === "string" ? data.error : "通信に失敗しました。時間をおいて再試行してください。";
}

export function Board() {
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [listError, setListError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const requestId = useRef(0);
  const backgroundInFlight = useRef(false);
  const authorEdited = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedAuthor = window.localStorage.getItem(AUTHOR_STORAGE_KEY);
        if (!authorEdited.current && savedAuthor !== null) setAuthor(savedAuthor.slice(0, MAX_AUTHOR_LENGTH));
      } catch {
        // Posting still works when browser storage is unavailable.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadPosts = useCallback(async (cursor?: string) => {
    const id = ++requestId.current;
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    setListError("");

    try {
      const response = await fetch(cursor ? `${endpoint}?cursor=${encodeURIComponent(cursor)}` : endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json() as PostPage;
      if (id !== requestId.current) return;
      setPosts((current) => cursor ? [...current, ...data.posts] : data.posts);
      setNextCursor(data.nextCursor);
    } catch (error) {
      if (id === requestId.current) setListError(error instanceof Error ? error.message : "投稿を読み込めませんでした。");
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  const refreshLatest = useCallback(async () => {
    if (backgroundInFlight.current) return;
    backgroundInFlight.current = true;
    const currentRequestId = requestId.current;

    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as PostPage;
      if (currentRequestId !== requestId.current) return;

      setPosts((current) => {
        const knownIds = new Set(current.map((post) => post.id));
        const newPosts = data.posts.filter((post) => !knownIds.has(post.id));
        return newPosts.length > 0 ? [...newPosts, ...current] : current;
      });
      if (posts.length === 0) setNextCursor(data.nextCursor);
      setListError("");
    } catch {
      // Keep the last loaded posts; the next interval will retry.
    } finally {
      backgroundInFlight.current = false;
    }
  }, [posts.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadPosts(); }, 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [loadPosts]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && !loading && !loadingMore && !submitting) {
        void refreshLatest();
      }
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [loading, loadingMore, submitting, refreshLatest]);

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const submittedAuthor = author.trim();
    setSubmitting(true);
    setSubmitMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, body }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      try {
        if (submittedAuthor) window.localStorage.setItem(AUTHOR_STORAGE_KEY, submittedAuthor);
        else window.localStorage.removeItem(AUTHOR_STORAGE_KEY);
      } catch {
        // A successful post does not depend on browser storage.
      }
      setBody("");
      setSubmitMessage("投稿しました。");
      await loadPosts();
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : "投稿できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.25fr)]">
      <form onSubmit={submitPost} className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">新しく投稿する</h2>
        <div>
          <label htmlFor="chat-author" className="mb-2 block text-sm font-semibold">お名前 <span className="font-normal text-neutral-500">（任意）</span></label>
          <input id="chat-author" value={author} onChange={(event) => { authorEdited.current = true; setAuthor(event.target.value); }} maxLength={MAX_AUTHOR_LENGTH} placeholder="空欄なら名無しさん" aria-describedby="chat-author-limit" className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700" />
          <p id="chat-author-limit" className="mt-1 text-right text-xs text-neutral-500">{author.length} / {MAX_AUTHOR_LENGTH}文字</p>
          <p className="mt-1 text-xs text-neutral-500">投稿後、名前をこのブラウザに保存します。</p>
        </div>
        <div>
          <label htmlFor="chat-body" className="mb-2 block text-sm font-semibold">本文</label>
          <textarea id="chat-body" value={body} onChange={(event) => setBody(event.target.value)} required maxLength={MAX_BODY_LENGTH} rows={6} placeholder="メッセージを入力" className="w-full resize-y rounded-lg border border-neutral-300 bg-transparent px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700" />
          <p className="mt-1 text-right text-xs text-neutral-500">{body.length} / {MAX_BODY_LENGTH}文字</p>
        </div>
        <p className="text-xs text-neutral-500">投稿後は30秒間、次の投稿を待ってください。</p>
        <button type="submit" disabled={submitting || !body.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Send aria-hidden="true" className="size-4" />{submitting ? "投稿中…" : "投稿する"}</button>
        {submitMessage && <p role="status" className={`text-sm ${submitMessage === "投稿しました。" ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{submitMessage}</p>}
      </form>

      <section aria-labelledby="chat-posts-title" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="chat-posts-title" className="text-lg font-semibold">みんなの投稿</h2>
            <p className="mt-1 text-xs text-neutral-500">約10秒ごとに自動更新</p>
          </div>
          <button type="button" onClick={() => void loadPosts()} disabled={loading || loadingMore} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"><RefreshCw aria-hidden="true" className="size-4" />更新</button>
        </div>
        {listError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{listError}</p>}
        {loading && posts.length === 0 ? <p className="mt-6 flex items-center gap-2 text-sm text-neutral-500"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />読み込み中…</p> : null}
        {!loading && !listError && posts.length === 0 ? <p className="mt-6 text-sm text-neutral-500">まだ投稿はありません。最初のメッセージをどうぞ。</p> : null}
        {posts.length > 0 && (
          <ol className="mt-5 space-y-4" aria-live="polite">
            {posts.map((post) => (
              <li key={post.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <div className="min-w-0">
                    <span className="font-semibold break-words">{post.author}</span>
                    <p className="mt-0.5 font-mono text-xs text-neutral-500">ID: {post.posterId}</p>
                  </div>
                  <time dateTime={post.createdAt} className="text-xs text-neutral-500">{new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }).format(new Date(post.createdAt))}</time>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{post.body}</p>
              </li>
            ))}
          </ol>
        )}
        {nextCursor && <button type="button" onClick={() => void loadPosts(nextCursor)} disabled={loading || loadingMore} className="mt-5 w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800">{loadingMore ? "読み込み中…" : "以前の投稿を表示"}</button>}
      </section>
    </div>
  );
}
