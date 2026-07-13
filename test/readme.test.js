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
  assert.ok(exampleBlocks.length >= 4);

  for (const [, exampleUrl] of exampleBlocks) {
    assert.match(exampleUrl, /^https:\/\/ctg-tme\.github\.io\/Simple-WebWidget\//);

    const url = new URL(exampleUrl);
    assert.doesNotThrow(() =>
      parseWidgetConfiguration(url.hash, { baseUrl: url.href }),
    );
  }
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

  assert.ok(imagePaths.length >= 16);

  await Promise.all(
    imagePaths.map((imagePath) => access(new URL(`../${imagePath}`, import.meta.url))),
  );
});
