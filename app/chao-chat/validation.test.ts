import { describe, expect, test } from "bun:test";
import { validatePost } from "./validation";

describe("anonymous board posts", () => {
  test("accepts a message without a name and trims whitespace", () => {
    expect(validatePost({ author: "  ", body: "  こんにちは  " })).toEqual({
      ok: true,
      author: "名無しさん",
      body: "こんにちは",
    });
  });

  test("rejects empty and overlong messages", () => {
    expect(validatePost({ author: "A", body: "   " })).toMatchObject({ ok: false });
    expect(validatePost({ author: "A", body: "あ".repeat(1001) })).toMatchObject({ ok: false });
    expect(validatePost({ author: "あ".repeat(25), body: "本文" })).toMatchObject({ ok: false });
  });
});
