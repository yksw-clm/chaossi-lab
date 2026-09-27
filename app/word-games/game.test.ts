import { describe, expect, test } from "bun:test";
import {
  acceptAnswer, createGame, expireTurn, getAnswerWarnings, getRemainingMs,
  invalidateLastAnswer, pauseGame, resignCurrentPlayer, restoreGame,
  resumeGame, serializeGame, undoLast, validateSettings,
  type GameMode,
} from "./game";

function game(mode: GameMode = "shiritori", names = ["あか", "あお", "みどり"]) {
  return createGame({ mode, topic: mode === "yamanote" ? "駅名" : "", turnSeconds: 30, names }, 1000);
}

describe("game settings", () => {
  test("accepts ordered participants and an optional shiritori topic", () => {
    const result = validateSettings("shiritori", " ", "30", " あか \n あお \n");
    expect(result.errors).toEqual({});
    expect(result.settings?.names).toEqual(["あか", "あお"]);
    expect(result.settings?.topic).toBe("");
  });

  test("rejects missing topic, blank or duplicate names, and invalid duration", () => {
    expect(validateSettings("yamanote", " ", "0", "あか\n\nあお").errors).toEqual({
      topic: "山手線ゲームのお題を入力してください。",
      turnSeconds: "制限時間は1〜3600秒の整数で入力してください。",
      names: "参加者名に空欄があります。",
    });
    expect(validateSettings("shiritori", "", "1.5", "あか\nあか").errors.names).toBe("参加者名が重複しています。");
  });

  test("randomizes the turn order only when requested", () => {
    const settings = { mode: "shiritori" as const, topic: "", turnSeconds: 30, names: ["あか", "あお", "みどり"] };
    expect(createGame({ ...settings, turnOrder: "as-entered" }, 1000, () => 0).players.map((player) => player.name)).toEqual(settings.names);
    expect(createGame({ ...settings, turnOrder: "random" }, 1000, () => 0).players.map((player) => player.name)).toEqual(["あお", "みどり", "あか"]);
  });
});

describe("answers and turn order", () => {
  test("records answers in order and moves to the next active player", () => {
    const first = acceptAnswer(game(), "りんご", 2000);
    expect(first.moves).toEqual([{ type: "answer", playerId: 0, answer: "りんご" }]);
    expect(first.currentPlayerId).toBe(1);
    expect(first.deadlineAt).toBe(32000);
    const second = acceptAnswer(first, "ごりら", 3000);
    expect(second.currentPlayerId).toBe(2);
    expect(second.moves).toHaveLength(2);
  });

  test("warns for duplicates, broken chains and words ending in ん", () => {
    const first = acceptAnswer(game(), "リンゴ", 2000);
    expect(getAnswerWarnings(first, "りんご")).toContain("すでに使われた回答です。");
    expect(getAnswerWarnings(first, "らっぱ")).toContain("「ご」から始まる回答ではありません。");
    expect(getAnswerWarnings(first, "ごはん")).toContain("「ん」で終わる回答です。");
    expect(getAnswerWarnings(first, "ごりら")).toEqual([]);
  });

  test("asks for manual reading checks on kanji, while yamanote only checks duplicates", () => {
    const first = acceptAnswer(game(), "りんご", 2000);
    expect(getAnswerWarnings(first, "林檎")).toContain("読みとつながりを確認してください。漢字などの回答は自動判定できません。");
    const yamanote = acceptAnswer(game("yamanote"), "東京", 2000);
    expect(getAnswerWarnings(yamanote, "大阪")).toEqual([]);
    expect(getAnswerWarnings(yamanote, "東京")).toContain("すでに使われた回答です。");
  });
});

describe("timer and recovery", () => {
  test("eliminates a timed out player and ends with one winner", () => {
    const first = expireTurn(game("shiritori", ["あか", "あお"]), 31000);
    expect(first.status).toBe("finished");
    expect(first.currentPlayerId).toBe(1);
    expect(first.players[0].eliminated).toBe(true);
    expect(first.players.map((player) => player.rank)).toEqual([2, 1]);
    expect(first.moves).toEqual([{ type: "timeout", playerId: 0 }]);
    expect(acceptAnswer(first, "りんご", 32000)).toBe(first);
  });

  test("skips eliminated players, and undo restores a paused turn", () => {
    const first = expireTurn(game(), 31000);
    const second = acceptAnswer(first, "りんご", 32000);
    expect(second.currentPlayerId).toBe(2);
    const third = acceptAnswer(second, "ごりら", 33000);
    expect(third.currentPlayerId).toBe(1);
    const undone = undoLast(third);
    expect(undone.currentPlayerId).toBe(2);
    expect(undone.moves).toHaveLength(2);
    expect(undone.status).toBe("paused");
    expect(undone.undo).toBeNull();
  });

  test("undoing a timeout restores a full turn and the player", () => {
    const timedOut = expireTurn(game("shiritori", ["あか", "あお"]), 31000);
    const undone = undoLast(timedOut);
    expect(undone.players[0].eliminated).toBe(false);
    expect(undone.players.map((player) => player.rank)).toEqual([null, null]);
    expect(undone.currentPlayerId).toBe(0);
    expect(undone.remainingMs).toBe(30000);
    expect(undone.status).toBe("paused");
  });

  test("pause and resume preserve the remaining duration", () => {
    const paused = pauseGame(game(), 11000);
    expect(paused.remainingMs).toBe(20000);
    expect(getRemainingMs(paused, 100000)).toBe(20000);
    const resumed = resumeGame(paused, 50000);
    expect(resumed.deadlineAt).toBe(70000);
    expect(getRemainingMs(resumed, 55000)).toBe(15000);
  });

  test("saved games restore paused with the latest remaining time", () => {
    const current = acceptAnswer(game(), "りんご", 2000);
    const restored = restoreGame(serializeGame(current, 12000));
    expect(restored?.status).toBe("paused");
    expect(restored?.remainingMs).toBe(20000);
    expect(restored?.currentPlayerId).toBe(1);
    expect(restored?.moves).toHaveLength(1);
    expect(restored?.players.every((player) => player.rank === null)).toBe(true);
    expect(restoreGame("broken json")).toBeNull();
  });

  test("resignation eliminates the current player and can be undone", () => {
    const resigned = resignCurrentPlayer(game(), 5000);
    expect(resigned.moves).toEqual([{ type: "resignation", playerId: 0 }]);
    expect(resigned.players[0].eliminated).toBe(true);
    expect(resigned.players[0].rank).toBe(3);
    expect(resigned.currentPlayerId).toBe(1);
    const undone = undoLast(resigned);
    expect(undone.players[0].eliminated).toBe(false);
    expect(undone.remainingMs).toBe(26000);
    expect(undone.status).toBe("paused");
  });

  test("resignation from pause leaves the next turn paused", () => {
    const resigned = resignCurrentPlayer(pauseGame(game(), 5000), 10000);
    expect(resigned.status).toBe("paused");
    expect(resigned.remainingMs).toBe(30000);
    expect(resigned.deadlineAt).toBeNull();
  });

  test("invalidating the last answer removes it and eliminates its author", () => {
    const answered = acceptAnswer(game(), "りんご", 2000);
    const challenged = pauseGame(answered, 7000);
    const invalidated = invalidateLastAnswer(challenged, 8000, true);
    expect(invalidated.moves).toEqual([]);
    expect(invalidated.players[0].eliminated).toBe(true);
    expect(invalidated.players[0].rank).toBe(3);
    expect(invalidated.currentPlayerId).toBe(1);
    expect(invalidated.status).toBe("playing");
    expect(invalidated.deadlineAt).toBe(38000);
    expect(undoLast(invalidated).moves).toEqual([{ type: "answer", playerId: 0, answer: "りんご" }]);
  });

  test("invalidating an answer with two players finishes the game", () => {
    const answered = acceptAnswer(game("shiritori", ["あか", "あお"]), "りんご", 2000);
    const invalidated = invalidateLastAnswer(pauseGame(answered, 7000), 8000, true);
    expect(invalidated.status).toBe("finished");
    expect(invalidated.currentPlayerId).toBe(1);
    expect(invalidated.players.map((player) => player.rank)).toEqual([2, 1]);
    expect(invalidated.deadlineAt).toBeNull();
  });

  test("awards ranks from last place to champion across different elimination reasons", () => {
    const first = expireTurn(game("shiritori", ["あか", "あお", "みどり", "きいろ"]), 31000);
    const answered = acceptAnswer(first, "りんご", 32000);
    const invalidated = invalidateLastAnswer(pauseGame(answered, 33000), 34000, true);
    const finished = resignCurrentPlayer(invalidated, 35000);

    expect(finished.status).toBe("finished");
    expect(finished.players.map((player) => player.rank)).toEqual([4, 3, 2, 1]);
    expect(undoLast(finished).players.map((player) => player.rank)).toEqual([4, 3, null, null]);
    expect(restoreGame(serializeGame(finished, 36000))?.players.map((player) => player.rank)).toEqual([4, 3, 2, 1]);
  });

  test("restores ranks for games saved before ranking was added", () => {
    const oldSave = JSON.parse(serializeGame(expireTurn(game(), 31000), 32000));
    oldSave.version = 1;
    for (const player of oldSave.game.players) delete player.rank;
    for (const player of oldSave.game.undo.players) delete player.rank;

    const restored = restoreGame(JSON.stringify(oldSave));
    expect(restored?.players.map((player) => player.rank)).toEqual([3, null, null]);
    expect(restored?.undo?.players.map((player) => player.rank)).toEqual([null, null, null]);
  });
});
