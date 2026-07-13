import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");

test("links the unconfigured QR code to the README user guide", () => {
  assert.match(
    html,
    /href="https:\/\/github\.com\/ctg-tme\/Simple-WebWidget#user-guide"/,
  );
  assert.match(html, /src="\.\/configure-widget\.png"/);
  assert.match(html, /Scan to learn how to configure this WebWidget/);
  assert.match(html, /id="configuration-error" hidden/);
});

test("places borderless branding inline with the heading and keeps info3 independent", () => {
  const header = html.slice(
    html.indexOf('<header id="header"'),
    html.indexOf("</header>") + "</header>".length,
  );

  assert.match(header, /id="brand"[\s\S]*id="brand-image"[\s\S]*id="heading"/);
  assert.match(html, /<section id="info-3" class="info-block" hidden><\/section>/);
  assert.doesNotMatch(html, /brandable-block|info-block--brandable/);
});

test("does not remove rendered frames with a fixed load timeout", () => {
  assert.match(main, /getInformationFrameSandbox/);
  assert.doesNotMatch(
    main,
    /FRAME_LOAD_TIMEOUT|information-frame-load-timeout/,
  );
});
