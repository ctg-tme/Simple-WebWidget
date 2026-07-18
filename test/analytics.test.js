import test from "node:test";
import assert from "node:assert/strict";
import {
  PAGE_OPENED_EVENT,
  PARAMETER_USED_EVENT,
  XLAUNCH_USED_EVENT,
  createInitialAnalyticsEvents,
  createLaunchSourceEvent,
  createPageOpenedEvent,
  createParameterUsedEvents,
  getLaunchSource,
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

test("builds one page-opened event without parameter-presence booleans", () => {
  assert.deepEqual(
    createPageOpenedEvent("#theme=ArcticNight&time=true&info2=Example"),
    {
      name: PAGE_OPENED_EVENT,
      properties: {},
    },
  );
  assert.deepEqual(createPageOpenedEvent("").properties, {});
});

test("captures xLaunch as a dedicated categorical launch-source event", () => {
  const event = createLaunchSourceEvent(
    "#heading=Private%20heading&info1=Private%20content&xLaunch=SWW_Example",
  );

  assert.deepEqual(event, {
    name: XLAUNCH_USED_EVENT,
    properties: { launch_source: "SWW_Example" },
  });
  assert.doesNotMatch(JSON.stringify(event), /Private heading|Private content/);
  assert.equal(getLaunchSource("#xLaunch=%20Partner_App%20"), "Partner_App");
  assert.equal(createLaunchSourceEvent("#heading=Example"), null);
});

test("represents parameter names as values of one categorical dimension", () => {
  assert.deepEqual(
    createParameterUsedEvents(
      "#theme=ArcticNight&heading=Private&info1=Private&xLaunch=portal",
    ),
    [
      {
        name: PARAMETER_USED_EVENT,
        properties: { parameter_name: "heading" },
      },
      {
        name: PARAMETER_USED_EVENT,
        properties: { parameter_name: "info1" },
      },
      {
        name: PARAMETER_USED_EVENT,
        properties: { parameter_name: "theme" },
      },
      {
        name: PARAMETER_USED_EVENT,
        properties: { parameter_name: "xLaunch" },
      },
    ],
  );
});

test("creates one page event plus one usage event per recognized parameter", () => {
  const events = createInitialAnalyticsEvents(
    "#heading=Private&unknown=ignored&time=true",
  );

  assert.equal(events[0].name, PAGE_OPENED_EVENT);
  assert.deepEqual(
    events.slice(1).map(({ properties }) => properties.parameter_name),
    ["heading", "time"],
  );
  assert.doesNotMatch(JSON.stringify(events), /Private|ignored/);
});

test("does not capture invalid or ambiguous xLaunch values", () => {
  assert.equal(
    getLaunchSource("#xLaunch=" + "a".repeat(INPUT_LIMITS.xLaunch + 1)),
    "",
  );
  assert.equal(getLaunchSource("#xLaunch=one&xLaunch=two"), "");
  assert.equal(getLaunchSource("#xLaunch=bad%ZZvalue"), "");
  assert.equal(createLaunchSourceEvent("#xLaunch=one&xLaunch=two"), null);
});

test("does not parse oversized or malformed fragments for analytics", () => {
  assert.deepEqual(
    getParameterNamesInUse("#" + "a".repeat(INPUT_LIMITS.fragment + 1)),
    [],
  );
  assert.deepEqual(getParameterNamesInUse("#heading=bad%ZZvalue"), []);
});

test("records parameter usage as one categorical Aptabase dimension", async () => {
  const calls = [];
  const result = await trackPageOpened(
    "#theme=ArcticNight&heading=Example&info1=Private&xLaunch=portal",
    {
      appKey: "A-US-example",
      initialize: (key) => calls.push(["init", key]),
      track: (name, properties) => calls.push(["track", name, properties]),
    },
  );

  assert.deepEqual(result, { tracked: true });
  assert.deepEqual(calls, [
    ["init", "A-US-example"],
    ["track", PAGE_OPENED_EVENT, {}],
    ["track", PARAMETER_USED_EVENT, { parameter_name: "heading" }],
    ["track", PARAMETER_USED_EVENT, { parameter_name: "info1" }],
    ["track", PARAMETER_USED_EVENT, { parameter_name: "theme" }],
    ["track", PARAMETER_USED_EVENT, { parameter_name: "xLaunch" }],
    ["track", XLAUNCH_USED_EVENT, { launch_source: "portal" }],
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
