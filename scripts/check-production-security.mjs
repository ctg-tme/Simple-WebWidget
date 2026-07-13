import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CONTENT_SECURITY_POLICY } from "../src/security.js";

const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
const encodedContentSecurityPolicy = CONTENT_SECURITY_POLICY.replaceAll(
  "'",
  "&#39;",
);

assert.match(
  html,
  /<meta\s+name="referrer"\s+content="no-referrer"\s*\/?>/,
  "Production HTML must set a no-referrer policy",
);
assert.ok(
  html.includes(`content="${encodedContentSecurityPolicy}"`),
  "Production HTML must contain the expected Content Security Policy",
);
assert.doesNotMatch(html, /unsafe-inline|unsafe-eval/);
assert.doesNotMatch(
  html,
  /src="\/src\//,
  "Production HTML must reference bundled assets, not Vite source files",
);
assert.match(
  html,
  /src="\.\/assets\/[^\"]+\.js"/,
  "Production scripts must use a repository-relative asset path",
);
assert.match(
  html,
  /<img\s+id="brand-image"\s+alt="Branding"\s+referrerpolicy="no-referrer"\s*\/?>/,
  "The branding image must suppress referrer information",
);

await readFile(new URL("../dist/configure-widget.png", import.meta.url));

console.log("Production browser security policy verified.");
