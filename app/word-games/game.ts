export type GameMode = "shiritori" | "yamanote";
export type GameStatus = "playing" | "paused" | "finished";
export type TurnOrder = "as-entered" | "random";

export type Player = {
  id: number;
  name: string;
  eliminated: boolean;
  rank: number | null;
};

export type Move =
  | { playerId: number; type: "answer"; answer: string }
  | { playerId: number; type: "timeout" }
  | { playerId: number; type: "resignation" };

type GameSnapshot = {
  players: Player[];
  moves: Move[];
  currentPlayerId: number | null;
  remainingMs: number;
  status: GameStatus;
};

export type GameState = GameSnapshot & {
  mode: GameMode;
  topic: string;
  turnSeconds: number;
  deadlineAt: number | null;
  undo: GameSnapshot | null;
};

export type GameSettings = {
  mode: GameMode;
  topic: string;
  turnSeconds: number;
  names: string[];
  turnOrder?: TurnOrder;
};

export type SettingsErrors = Partial<Record<"topic" | "turnSeconds" | "names", string>>;

export const STORAGE_KEY = "chaossi-lab-word-games-v1";

export function validateSettings(
  mode: GameMode,
  topicInput: string,
  secondsInput: string,
  namesInput: string,
  turnOrder: TurnOrder = "as-entered",
): { settings: GameSettings | null; errors: SettingsErrors } {
  const errors: SettingsErrors = {};
  const topic = topicInput.trim();
  const turnSeconds = Number(secondsInput);
  const lines = namesInput.replace(/\r/g, "").split("\n");

  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  const names = lines.map((name) => name.trim());

  if (mode === "yamanote" && !topic) {
    errors.topic = "山手線ゲームのお題を入力してください。";
  }
  if (!Number.isInteger(turnSeconds) || turnSeconds < 1 || turnSeconds > 3600) {
    errors.turnSeconds = "制限時間は1〜3600秒の整数で入力してください。";
  }
  if (names.length < 2) {
    errors.names = "参加者を2人以上、1行に1人ずつ入力してください。";
  } else if (names.some((name) => !name)) {
    errors.names = "参加者名に空欄があります。";
  } else if (new Set(names.map((name) => name.normalize("NFKC").toLocaleLowerCase())).size !== names.length) {
    errors.names = "参加者名が重複しています。";
  }

  return {
    settings: Object.keys(errors).length ? null : { mode, topic, turnSeconds, names, turnOrder },
    errors,
  };
}

export function createGame(settings: GameSettings, now: number, random: () => number = Math.random): GameState {
  const names = [...settings.names];
  if (settings.turnOrder === "random") {
    for (let index = names.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(random() * (index + 1));
      [names[index], names[swapIndex]] = [names[swapIndex], names[index]];
    }
  }
  return {
    mode: settings.mode,
    topic: settings.topic,
    turnSeconds: settings.turnSeconds,
    players: names.map((name, id) => ({ id, name, eliminated: false, rank: null })),
    moves: [],
    currentPlayerId: 0,
    remainingMs: settings.turnSeconds * 1000,
    deadlineAt: now + settings.turnSeconds * 1000,
    status: "playing",
    undo: null,
  };
}

export function getRemainingMs(game: GameState, now: number): number {
  return game.status === "playing" && game.deadlineAt !== null
    ? Math.max(0, game.deadlineAt - now)
    : game.remainingMs;
}

function nextActivePlayer(players: Player[], currentId: number): number | null {
  for (let offset = 1; offset <= players.length; offset++) {
    const player = players[(currentId + offset) % players.length];
    if (!player.eliminated) return player.id;
  }
  return null;
}

function undoSnapshot(game: GameState, now: number, timeout: boolean): GameSnapshot {
  return {
    players: game.players,
    moves: game.moves,
    currentPlayerId: game.currentPlayerId,
    remainingMs: timeout ? game.turnSeconds * 1000 : getRemainingMs(game, now),
    status: "paused",
  };
}

export function acceptAnswer(game: GameState, answerInput: string, now: number): GameState {
  const answer = answerInput.trim();
  if (game.status !== "playing" || game.currentPlayerId === null || !answer) return game;
  if (getRemainingMs(game, now) === 0) return expireTurn(game, now);

  const nextPlayerId = nextActivePlayer(game.players, game.currentPlayerId);
  return {
    ...game,
    moves: [...game.moves, { type: "answer", playerId: game.currentPlayerId, answer }],
    currentPlayerId: nextPlayerId,
    remainingMs: game.turnSeconds * 1000,
    deadlineAt: now + game.turnSeconds * 1000,
    undo: undoSnapshot(game, now, false),
  };
}

export function expireTurn(game: GameState, now: number): GameState {
  if (game.status !== "playing" || game.currentPlayerId === null || getRemainingMs(game, now) > 0) return game;

  return eliminateCurrentPlayer(game, "timeout", now, game.currentPlayerId);
}

export function resignCurrentPlayer(game: GameState, now: number): GameState {
  if (game.status === "finished" || game.currentPlayerId === null) return game;
  if (game.status === "playing" && getRemainingMs(game, now) === 0) return expireTurn(game, now);
  return eliminateCurrentPlayer(game, "resignation", now, game.currentPlayerId);
}

export function invalidateLastAnswer(game: GameState, now: number, resume: boolean): GameState {
  const lastMove = game.moves.at(-1);
  if (game.status !== "paused" || lastMove?.type !== "answer" || game.currentPlayerId === null) return game;

  const rank = game.players.filter((player) => !player.eliminated).length;
  const eliminatedPlayers = game.players.map((player) =>
    player.id === lastMove.playerId ? { ...player, eliminated: true, rank } : player,
  );
  const remaining = eliminatedPlayers.filter((player) => !player.eliminated);
  const finished = remaining.length <= 1;
  const players = finished
    ? eliminatedPlayers.map((player) => player.eliminated ? player : { ...player, rank: 1 })
    : eliminatedPlayers;
  const currentPlayerId = players[game.currentPlayerId].eliminated
    ? nextActivePlayer(players, game.currentPlayerId)
    : game.currentPlayerId;

  return {
    ...game,
    players,
    moves: game.moves.slice(0, -1),
    currentPlayerId: finished ? (remaining[0]?.id ?? null) : currentPlayerId,
    remainingMs: finished ? 0 : game.turnSeconds * 1000,
    deadlineAt: !finished && resume ? now + game.turnSeconds * 1000 : null,
    status: finished ? "finished" : resume ? "playing" : "paused",
    undo: undoSnapshot(game, now, false),
  };
}

function eliminateCurrentPlayer(game: GameState, type: "timeout" | "resignation", now: number, playerId: number): GameState {
  const rank = game.players.filter((player) => !player.eliminated).length;
  const eliminatedPlayers = game.players.map((player) =>
    player.id === playerId ? { ...player, eliminated: true, rank } : player,
  );
  const remaining = eliminatedPlayers.filter((player) => !player.eliminated);
  const finished = remaining.length <= 1;
  const players = finished
    ? eliminatedPlayers.map((player) => player.eliminated ? player : { ...player, rank: 1 })
    : eliminatedPlayers;

  return {
    ...game,
    players,
    moves: [...game.moves, { type, playerId }],
    currentPlayerId: finished ? (remaining[0]?.id ?? null) : nextActivePlayer(players, playerId),
    remainingMs: finished ? 0 : game.turnSeconds * 1000,
    deadlineAt: finished || game.status === "paused" ? null : now + game.turnSeconds * 1000,
    status: finished ? "finished" : game.status,
    undo: undoSnapshot(game, now, type === "timeout"),
  };
}

export function pauseGame(game: GameState, now: number): GameState {
  if (game.status !== "playing") return game;
  if (getRemainingMs(game, now) === 0) return pauseGame(expireTurn(game, now), now);
  return { ...game, remainingMs: getRemainingMs(game, now), deadlineAt: null, status: "paused" };
}

export function resumeGame(game: GameState, now: number): GameState {
  if (game.status !== "paused") return game;
  return { ...game, deadlineAt: now + game.remainingMs, status: "playing" };
}

export function undoLast(game: GameState): GameState {
  if (!game.undo) return game;
  return { ...game, ...game.undo, status: "paused", deadlineAt: null, undo: null };
}

function normalizeWord(word: string): string {
  return word.normalize("NFKC").trim().toLocaleLowerCase().replace(/[\u30a1-\u30f6]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) - 0x60),
  );
}

const smallKana: Record<string, string> = {
  ぁ: "あ", ぃ: "い", ぅ: "う", ぇ: "え", ぉ: "お",
  ゃ: "や", ゅ: "ゆ", ょ: "よ", っ: "つ", ゎ: "わ",
};

function edgeKana(word: string, fromEnd: boolean): string {
  const characters = [...word].filter((character) => character !== "ー");
  const character = fromEnd ? characters.at(-1) : characters[0];
  return character ? (smallKana[character] ?? character) : "";
}

export function getAnswerWarnings(game: GameState, answerInput: string): string[] {
  const answer = answerInput.trim();
  if (!answer) return [];

  const warnings: string[] = [];
  const normalized = normalizeWord(answer);
  const previousAnswers = game.moves.filter((move): move is Extract<Move, { type: "answer" }> => move.type === "answer");

  if (previousAnswers.some((move) => normalizeWord(move.answer) === normalized)) {
    warnings.push("すでに使われた回答です。");
  }

  if (game.mode === "shiritori") {
    const previous = previousAnswers.at(-1);
    const isKana = /^[\p{Script=Hiragana}ー]+$/u.test(normalized);
    const previousKana = previous ? normalizeWord(previous.answer) : "";

    if (!isKana || (previous && !/^[\p{Script=Hiragana}ー]+$/u.test(previousKana))) {
      warnings.push("読みとつながりを確認してください。漢字などの回答は自動判定できません。");
    } else {
      if (previous && edgeKana(previousKana, true) !== edgeKana(normalized, false)) {
        warnings.push(`「${edgeKana(previousKana, true)}」から始まる回答ではありません。`);
      }
      if (edgeKana(normalized, true) === "ん") {
        warnings.push("「ん」で終わる回答です。");
      }
    }
  }

  return warnings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSnapshot(value: unknown): value is GameSnapshot & Record<string, unknown> {
  if (!isRecord(value) || !Array.isArray(value.players) || !Array.isArray(value.moves)) return false;
  const players = value.players;
  return (
    players.every((player) => isRecord(player) && Number.isInteger(player.id) && typeof player.name === "string" && typeof player.eliminated === "boolean" && (player.rank === undefined || player.rank === null || (Number.isInteger(player.rank) && (player.rank as number) >= 1 && (player.rank as number) <= players.length))) &&
    value.moves.every((move) => isRecord(move) && Number.isInteger(move.playerId) && (move.type === "timeout" || move.type === "resignation" || (move.type === "answer" && typeof move.answer === "string"))) &&
    (value.currentPlayerId === null || Number.isInteger(value.currentPlayerId)) &&
    typeof value.remainingMs === "number" && Number.isFinite(value.remainingMs) && value.remainingMs >= 0 &&
    (value.status === "playing" || value.status === "paused" || value.status === "finished")
  );
}

function addMissingRanks(snapshot: GameSnapshot): GameSnapshot {
  if (snapshot.players.every((player) => player.rank !== undefined)) return snapshot;

  const eliminatedIds = new Set(snapshot.players.filter((player) => player.eliminated).map((player) => player.id));
  const order = snapshot.moves
    .filter((move) => (move.type === "timeout" || move.type === "resignation") && eliminatedIds.has(move.playerId))
    .map((move) => move.playerId);
  for (const player of snapshot.players) {
    if (player.eliminated && !order.includes(player.id)) order.push(player.id);
  }

  return {
    ...snapshot,
    players: snapshot.players.map((player) => ({
      ...player,
      rank: player.eliminated
        ? snapshot.players.length - order.indexOf(player.id)
        : snapshot.status === "finished" ? 1 : null,
    })),
  };
}

export function serializeGame(game: GameState, now: number): string {
  return JSON.stringify({
    version: 2,
    game: {
      ...game,
      remainingMs: getRemainingMs(game, now),
      deadlineAt: null,
      status: game.status === "playing" ? "paused" : game.status,
    },
  });
}

export function restoreGame(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const saved: unknown = JSON.parse(raw);
    if (!isRecord(saved) || (saved.version !== 1 && saved.version !== 2) || !isRecord(saved.game)) return null;
    const game = saved.game;
    if (
      !isSnapshot(game) ||
      (game.mode !== "shiritori" && game.mode !== "yamanote") ||
      typeof game.topic !== "string" ||
      typeof game.turnSeconds !== "number" ||
      !Number.isInteger(game.turnSeconds) ||
      game.turnSeconds < 1 ||
      game.turnSeconds > 3600 ||
      (game.undo !== null && !isSnapshot(game.undo)) ||
      game.players.length < 2 ||
      game.players.some((player: Player, index: number) => player.id !== index) ||
      (game.currentPlayerId !== null && !game.players.some((player: Player) => player.id === game.currentPlayerId))
    ) return null;
    const ranked = addMissingRanks(game);
    return {
      ...ranked,
      undo: game.undo === null ? null : addMissingRanks(game.undo as GameSnapshot),
      deadlineAt: null,
      status: game.status === "finished" ? "finished" : "paused",
    } as GameState;
  } catch {
    return null;
  }
}
