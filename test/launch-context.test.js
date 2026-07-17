import test from "node:test";
import assert from "node:assert/strict";
import { stripLaunchContextFromFragment } from "../src/launch-context.js";
import { INPUT_LIMITS } from "../src/config.js";

test("removes xLaunch without re-encoding the remaining fragment", () => {
  assert.equal(
    stripLaunchContextFromFragment(
      "#theme=ArcticNight&xLaunch=SWW_Example&info1=Keep%20this+encoding",
    ),
    "#theme=ArcticNight&info1=Keep%20this+encoding",
  );
});

test("removes xLaunch when it is the only parameter or has an encoded name", () => {
  assert.equal(stripLaunchContextFromFragment("#xLaunch=SWW_Example"), "");
  assert.equal(
    stripLaunchContextFromFragment("#heading=Example&%78Launch=SWW_Example"),
    "#heading=Example",
  );
});

test("leaves unrelated, malformed, and oversized fragments untouched", () => {
  assert.equal(
    stripLaunchContextFromFragment("#heading=Example"),
    "#heading=Example",
  );
  assert.equal(
    stripLaunchContextFromFragment("#heading=bad%ZZvalue"),
    "#heading=bad%ZZvalue",
  );

  const oversized = "#" + "a".repeat(INPUT_LIMITS.fragment + 1);
  assert.equal(stripLaunchContextFromFragment(oversized), oversized);
});
