import test from "node:test";
import assert from "node:assert/strict";
import { logWidgetIssue } from "../src/logger.js";

test("logs a stable issue code without exposing configuration values", () => {
  const calls = [];
  const logger = {
    error(...values) {
      calls.push(values);
    },
    warn(...values) {
      calls.push(values);
    },
  };

  logWidgetIssue(
    "error",
    "icon-url-unsupported-scheme",
    "Invalid widget configuration.",
    { logger },
  );

  assert.deepEqual(calls, [
    [
      "[Simple-WebWidget] Invalid widget configuration.",
      { code: "icon-url-unsupported-scheme" },
    ],
  ]);
});
