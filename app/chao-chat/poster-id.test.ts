import { describe, expect, test } from "bun:test";
import { createPosterId, posterIdCookie, readPosterId } from "./poster-id";

describe("browser poster ID", () => {
  test("reads the same ID from a cookie on later requests", () => {
    const id = createPosterId();
    expect(id).toMatch(/^[0-9A-F]{12}$/);
    expect(readPosterId(`theme=dark; ${posterIdCookie(id, true)}`)).toBe(id);
  });

  test("rejects malformed IDs", () => {
    expect(readPosterId(null)).toBeNull();
    expect(readPosterId("chao_chat_poster_id=not-valid")).toBeNull();
  });
});
