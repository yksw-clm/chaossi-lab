import { describe, expect, test } from "bun:test";
import { parseTopicHistory, rememberTopic } from "./topic-history";

describe("topic history", () => {
  test("keeps the most recently used topic first", () => {
    expect(rememberTopic(["駅名", "食べ物"], " 食べ物 ")).toEqual(["食べ物", "駅名"]);
    expect(rememberTopic(["駅名"], "動物")).toEqual(["動物", "駅名"]);
    expect(rememberTopic(["駅名"], "  ")).toEqual(["駅名"]);
  });

  test("reads valid saved topics and ignores malformed entries", () => {
    expect(parseTopicHistory(JSON.stringify([" 駅名 ", "食べ物", "駅名", "", 42]))).toEqual(["駅名", "食べ物"]);
    expect(parseTopicHistory("broken")).toEqual([]);
    expect(parseTopicHistory(null)).toEqual([]);
  });
});
