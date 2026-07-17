import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { parseWidgetConfiguration } from "../src/config.js";
import { SUPPORTED_THEMES } from "../src/themes.js";

const readmeUrl = new URL("../README.md", import.meta.url);
const readme = await readFile(readmeUrl, "utf8");

test("uses the GitHub Pages URL for every widget example", () => {
  assert.doesNotMatch(readme, /https?:\/\/(?:localhost|127\.0\.0\.1):\d+/);

  const exampleBlocks = [...readme.matchAll(/```text\n(https?:\/\/[^\n]+)\n```/g)];
  assert.ok(exampleBlocks.length >= 5);

  for (const [, exampleUrl] of exampleBlocks) {
    assert.match(exampleUrl, /^https:\/\/ctg-tme\.github\.io\/Simple-WebWidget\//);

    const url = new URL(exampleUrl);
    const params = new URLSearchParams(url.hash.slice(1));
    assert.equal(params.get("xLaunch"), "SWW_Example");
    assert.doesNotThrow(() =>
      parseWidgetConfiguration(url.hash, { baseUrl: url.href }),
    );
  }
});

test("places the transiently attributed unconfigured example first", () => {
  const examplesStart = readme.indexOf("### Ready-to-use examples");
  const unconfigured = readme.indexOf("#### Unconfigured widget", examplesStart);
  const configured = readme.indexOf("#### Three information blocks", examplesStart);

  assert.ok(unconfigured > examplesStart);
  assert.ok(unconfigured < configured);
  assert.match(
    readme.slice(unconfigured, configured),
    /#xLaunch=SWW_Example/,
  );
});

test("documents every supported RoomOS 26 theme", () => {
  for (const theme of SUPPORTED_THEMES) {
    assert.match(readme, new RegExp(`<code>${theme}</code>`));
  }
});

test("all README documentation images exist", async () => {
  const imagePaths = [
    ...readme.matchAll(/(?:src="|!\[[^\]]*\]\()(?<path>docs\/images\/[^\")]+)/g),
  ].map((match) => match.groups.path);

  assert.ok(imagePaths.length >= 20);

  await Promise.all(
    imagePaths.map((imagePath) => access(new URL(`../${imagePath}`, import.meta.url))),
  );
});

test("documents settings, strict parameters, automatic weather, and iframe limits", () => {
  assert.doesNotMatch(readme, /iconUrl[^\n]*(?:replaces|hidden when)/i);
  assert.match(readme, /weather code[^\n]*symbol/i);
  assert.match(readme, /HTTPS URL[^\n]*iframe/i);
  assert.match(readme, /X-Frame-Options/);
  assert.doesNotMatch(readme, /15-second load timeout/);
  assert.match(readme, /settings gear/i);
  assert.match(readme, /hideSettings/);
  assert.match(readme, /Legacy names, unknown parameters, duplicate parameters/);
  assert.match(readme, /Scan to learn more about the Simple WebWidget/);
  assert.match(readme, /H2R Graphics Countdown Timer/);
  assert.match(readme, /Barker Technologies AB/);
  assert.doesNotMatch(readme, /`message`/);
  assert.doesNotMatch(readme, /winter/i);
});
