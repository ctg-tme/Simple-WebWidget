import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");

test("guides an unconfigured user to the gear and README", () => {
  assert.match(
    html,
    /href="https:\/\/github\.com\/ctg-tme\/Simple-WebWidget#user-guide"/,
  );
  assert.match(html, /src="\.\/configure-widget\.png"/);
  assert.match(html, /Use the gear in the top-right to configure this WebWidget/);
  assert.match(html, /Scan to learn more about the Simple WebWidget/);
  assert.match(html, /id="configuration-error" hidden/);
});

test("provides an accessible settings dialog for every supported content type", () => {
  assert.match(html, /id="settings-button"[\s\S]*aria-haspopup="dialog"/);
  assert.match(html, /id="settings-modal"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /Not included/);
  assert.match(html, /Website \/ iframe/);
  assert.match(html, /H2R countdown/);
  assert.match(html, /https:\/\/h2r\.graphics\/tools\/countdown\//);
  assert.match(html, /id="setting-hide-settings"/);
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
