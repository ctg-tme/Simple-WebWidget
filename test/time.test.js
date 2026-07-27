import test from "node:test";
import assert from "node:assert/strict";
import { createTimeFormatter } from "../src/time.js";

test("uses 12-hour time by default", () => {
  const formatter = createTimeFormatter("UTC");

  assert.equal(formatter.resolvedOptions().hourCycle, "h12");
  assert.match(
    formatter.format(new Date("2026-07-27T13:05:00Z")),
    /(?:AM|PM)/i,
  );
});

test("uses 24-hour time only when requested", () => {
  const formatter = createTimeFormatter("UTC", true);

  assert.equal(formatter.resolvedOptions().hourCycle, "h23");
  assert.doesNotMatch(
    formatter.format(new Date("2026-07-27T13:05:00Z")),
    /(?:AM|PM)/i,
  );
});
