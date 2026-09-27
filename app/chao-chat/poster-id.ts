import { randomBytes } from "node:crypto";

const COOKIE_NAME = "chao_chat_poster_id";
const ID_PATTERN = /^[0-9A-F]{12}$/;

export function readPosterId(cookieHeader: string | null): string | null {
  const value = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  return value && ID_PATTERN.test(value) ? value : null;
}

export function createPosterId(): string {
  return randomBytes(6).toString("hex").toUpperCase();
}

export function posterIdCookie(id: string, secure: boolean): string {
  return `${COOKIE_NAME}=${id}; Max-Age=31536000; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}
