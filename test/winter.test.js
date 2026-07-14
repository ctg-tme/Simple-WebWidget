import test from "node:test";
import assert from "node:assert/strict";
import { isWinterActive } from "../src/winter.js";

test("enables winter automatically only in December", () => {
  assert.equal(isWinterActive(null, new Date(2026, 11, 1)), true);
  assert.equal(isWinterActive(null, new Date(2026, 10, 30)), false);
  assert.equal(isWinterActive(null, new Date(2027, 0, 1)), false);
});

test("honors explicit winter overrides in every month", () => {
  assert.equal(isWinterActive(true, new Date(2026, 6, 14)), true);
  assert.equal(isWinterActive(false, new Date(2026, 11, 24)), false);
});
