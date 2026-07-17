import test from "node:test";
import assert from "node:assert/strict";
import {
  PAGE_OPENED_EVENT,
  createPageOpenedEvent,
  getParameterNamesInUse,
  trackPageOpened,
} from "../src/analytics.js";
import { INPUT_LIMITS } from "../src/config.js";

test("reports only supported parameter names in a stable order", () => {
  const names = getParameterNamesInUse(
    "#info1=Confidential%20text&unknown=secret&heading=Private&xLaunch=portal",
  );

  assert.deepEqual(names, ["heading", "info1", "xLaunch"]);
  assert.doesNotMatch(names.join(","), /Confidential|Private|portal|secret/);
});

test("builds a page-opened event without fragment values", () => {
  assert.deepEqual(
    createPageOpenedEvent("#theme=ArcticNight&time=true&info2=Example"),
    {
      name: PAGE_OPENED_EVENT,
      properties: {
        parameter_names: "info2,theme,time",
        parameter_count: 3,
      },
    },
  );
  assert.equal(
    createPageOpenedEvent("").properties.parameter_names,
    "none",
  );
});

test("does not parse oversized or malformed fragments for analytics", () => {
  assert.deepEqual(
    getParameterNamesInUse("#" + "a".repeat(INPUT_LIMITS.fragment + 1)),
    [],
  );
  assert.deepEqual(getParameterNamesInUse("#heading=bad%ZZvalue"), []);
});

test("initializes Aptabase and records one page-opened event", async () => {
  const calls = [];
  const result = await trackPageOpened("#heading=Example&xLaunch=portal", {
    appKey: "A-US-example",
    initialize: (key) => calls.push(["init", key]),
    track: (name, properties) => calls.push(["track", name, properties]),
  });

  assert.deepEqual(result, { tracked: true });
  assert.deepEqual(calls, [
    ["init", "A-US-example"],
    [
      "track",
      PAGE_OPENED_EVENT,
      { parameter_names: "heading,xLaunch", parameter_count: 2 },
    ],
  ]);
});

test("does not initialize analytics without a build-injected App Key", async () => {
  let initialized = false;
  const result = await trackPageOpened("#heading=Example", {
    appKey: "",
    initialize: () => {
      initialized = true;
    },
  });

  assert.deepEqual(result, { tracked: false, reason: "missing-app-key" });
  assert.equal(initialized, false);
});
