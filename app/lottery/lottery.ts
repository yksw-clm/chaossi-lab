export function parseCandidates(input: string): string[] {
  return input
    .split(/[\n,、，]/)
    .map((candidate) => candidate.trim())
    .filter(Boolean);
}

export function drawCandidates<T>(
  candidates: readonly T[],
  count: number,
  random: () => number = Math.random,
): T[] {
  if (!Number.isInteger(count) || count < 1 || count > candidates.length) {
    throw new RangeError("抽出件数は候補数以内の正の整数にしてください。");
  }

  const pool = [...candidates];
  for (let index = 0; index < count; index++) {
    const swapIndex = index + Math.floor(random() * (pool.length - index));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, count);
}
