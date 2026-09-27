"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, RefreshCw, Send } from "lucide-react";
import { MAX_AUTHOR_LENGTH, MAX_BODY_LENGTH } from "./validation";

type Post = { id: string; author: string; body: string; createdAt: string };
type PostPage = { posts: Post[]; nextCursor: string | null };

const endpoint = "/api/chao-chat/posts";

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

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadPosts(); }, 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [loadPosts]);

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, body }),
      });
      if (!response.ok) throw new Error(await responseError(response));
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
          <input id="chat-author" value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={MAX_AUTHOR_LENGTH} placeholder="空欄なら名無しさん" className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700" />
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
        <div className="flex items-center justify-between gap-3">
          <h2 id="chat-posts-title" className="text-lg font-semibold">みんなの投稿</h2>
          <button type="button" onClick={() => void loadPosts()} disabled={loading || loadingMore} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"><RefreshCw aria-hidden="true" className="size-4" />更新</button>
        </div>
        {listError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{listError}</p>}
        {loading && posts.length === 0 ? <p className="mt-6 flex items-center gap-2 text-sm text-neutral-500"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />読み込み中…</p> : null}
        {!loading && !listError && posts.length === 0 ? <p className="mt-6 text-sm text-neutral-500">まだ投稿はありません。最初のメッセージをどうぞ。</p> : null}
        {posts.length > 0 && (
          <ol className="mt-5 space-y-4" aria-live="polite">
            {posts.map((post) => (
              <li key={post.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="font-semibold break-words">{post.author}</span>
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
