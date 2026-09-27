export const MAX_AUTHOR_LENGTH = 24;
export const MAX_BODY_LENGTH = 1000;

export function validatePost(value: unknown):
  | { ok: true; author: string; body: string }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "投稿内容を確認してください。" };
  }

  const { author, body } = value as Record<string, unknown>;
  if (typeof author !== "string" || typeof body !== "string") {
    return { ok: false, error: "投稿内容を確認してください。" };
  }

  const cleanAuthor = author.trim() || "名無しさん";
  const cleanBody = body.trim();
  if (cleanAuthor.length > MAX_AUTHOR_LENGTH) {
    return { ok: false, error: `名前は${MAX_AUTHOR_LENGTH}文字以内で入力してください。` };
  }
  if (!cleanBody || cleanBody.length > MAX_BODY_LENGTH) {
    return { ok: false, error: `本文は1〜${MAX_BODY_LENGTH}文字で入力してください。` };
  }

  return { ok: true, author: cleanAuthor, body: cleanBody };
}
