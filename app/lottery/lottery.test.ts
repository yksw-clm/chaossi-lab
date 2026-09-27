import { describe, expect, test } from "bun:test";
import { drawCandidates, parseCandidates } from "./lottery";

describe("candidate input", () => {
  test("accepts commas and line breaks and ignores empty entries", () => {
    expect(parseCandidates(" A, B\nC、 D，E\n\n F ")).toEqual(["A", "B", "C", "D", "E", "F"]);
  });
});

describe("drawing", () => {
  test("draws the requested number without changing the input", () => {
    const candidates = ["A", "B", "C", "D"];
    expect(drawCandidates(candidates, 2, () => 0.99)).toEqual(["D", "A"]);
    expect(candidates).toEqual(["A", "B", "C", "D"]);
  });

  test("drawing every candidate returns a full permutation", () => {
    const candidates = ["A", "B", "C", "D", "E", "F"];
    const result = drawCandidates(candidates, candidates.length, () => 0.99);
    expect(result).toHaveLength(candidates.length);
    expect(result.toSorted()).toEqual(candidates);
  });

  test("treats repeated labels as separate entries", () => {
    expect(drawCandidates(["A", "A", "B"], 3, () => 0).toSorted()).toEqual(["A", "A", "B"]);
  });

  test("rejects counts outside the available range", () => {
    expect(() => drawCandidates(["A", "B"], 0)).toThrow(RangeError);
    expect(() => drawCandidates(["A", "B"], 3)).toThrow(RangeError);
    expect(() => drawCandidates(["A", "B"], 1.5)).toThrow(RangeError);
  });
});
