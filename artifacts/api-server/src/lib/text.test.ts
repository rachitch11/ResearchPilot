import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mapWithConcurrency,
  passageOccursInSource,
  truncateText,
} from "./text";

test("passage matching ignores extra whitespace and case", () => {
  const source = "Global EV sales reached 14 million vehicles in 2023.";
  assert.equal(
    passageOccursInSource("global   EV sales reached 14 million vehicles in 2023.", source),
    true,
  );
});

test("short or invented passages are rejected", () => {
  const source = "Global EV sales reached 14 million vehicles in 2023.";
  assert.equal(passageOccursInSource("too short", source), false);
  assert.equal(
    passageOccursInSource("Global EV sales reached 99 million vehicles in 2023.", source),
    false,
  );
});

test("truncateText bounds oversized content", () => {
  assert.equal(truncateText("a".repeat(50), 12).length <= 13, true);
});

test("mapWithConcurrency preserves order", async () => {
  const values = await mapWithConcurrency([1, 2, 3, 4], 2, async (value) => value * 2);
  assert.deepEqual(values, [2, 4, 6, 8]);
});
