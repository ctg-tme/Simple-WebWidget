import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("links the unconfigured QR code to the README user guide", () => {
  assert.match(
    html,
    /href="https:\/\/github\.com\/ctg-tme\/Simple-WebWidget#user-guide"/,
  );
  assert.match(html, /src="\.\/configure-widget\.png"/);
  assert.match(html, /id="configuration-error" hidden/);
});
