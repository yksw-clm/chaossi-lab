export const TOPIC_HISTORY_KEY = "chaossi-lab-word-game-topics-v1";

export function rememberTopic(history: readonly string[], topic: string): string[] {
  const trimmed = topic.trim();
  if (!trimmed) return [...history];
  return [trimmed, ...history.filter((saved) => saved !== trimmed)];
}

export function parseTopicHistory(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const history: string[] = [];
    for (const value of parsed) {
      if (typeof value !== "string") continue;
      const topic = value.trim();
      if (topic && !history.includes(topic)) history.push(topic);
    }
    return history;
  } catch {
    return [];
  }
}
