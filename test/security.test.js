import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTENT_SECURITY_POLICY,
  validateFrameUrl,
  validateIconUrl,
} from "../src/security.js";

const productionPage = "https://example.github.io/Simple-WebWidget/";

test("allows same-origin HTTPS image URLs", () => {
  const result = validateIconUrl("./assets/brand.png", {
    baseUrl: productionPage,
  });

  assert.deepEqual(result, {
    ok: true,
    url: "https://example.github.io/Simple-WebWidget/assets/brand.png",
  });
});

test("allows arbitrary cross-origin HTTPS image URLs", () => {
  const result = validateIconUrl(
    "https://github.com/WebexSamples.png?size=256",
    { baseUrl: productionPage },
  );

  assert.deepEqual(result, {
    ok: true,
    url: "https://github.com/WebexSamples.png?size=256",
  });
});

test("allows same-origin HTTP only for local development", () => {
  const developmentOptions = {
    baseUrl: "http://10.0.0.25:5173/",
    isDevelopment: true,
  };

  assert.equal(
    validateIconUrl("http://10.0.0.25:5173/logo.png", developmentOptions).ok,
    true,
  );
  assert.equal(
    validateIconUrl("http://10.0.0.25:5173/logo.png", {
      ...developmentOptions,
      isDevelopment: false,
    }).reason,
    "private-host",
  );
  assert.equal(
    validateIconUrl("http://example.com/logo.png", {
      baseUrl: "http://example.com/",
      isDevelopment: true,
    }).reason,
    "insecure-same-origin",
  );
  assert.equal(
    validateIconUrl("https://localhost/logo.png", {
      baseUrl: "https://localhost/",
    }).reason,
    "private-host",
  );
});

test("rejects credentials, unsupported schemes, malformed URLs, and oversized values", () => {
  const options = { baseUrl: productionPage };

  assert.equal(
    validateIconUrl("https://user:password@www.cisco.com/logo.png", options).reason,
    "credentials",
  );
  assert.equal(validateIconUrl("javascript:alert(1)", options).ok, false);
  assert.equal(validateIconUrl("file:///tmp/logo.png", options).ok, false);
  assert.equal(validateIconUrl("data:image/png;base64,AA==", options).ok, false);
  assert.equal(validateIconUrl("http://[invalid", options).reason, "malformed");
  assert.equal(
    validateIconUrl("https://www.cisco.com/" + "a".repeat(2050), options).reason,
    "too-long",
  );
});

test("rejects private or loopback literal hosts", () => {
  const options = { baseUrl: productionPage };

  assert.equal(
    validateIconUrl("https://127.0.0.1/logo.png", options).reason,
    "private-host",
  );
  assert.equal(
    validateIconUrl("https://2130706433/logo.png", options).reason,
    "private-host",
  );
  assert.equal(
    validateIconUrl("https://10.0.0.1/logo.png", options).reason,
    "private-host",
  );
  assert.equal(
    validateIconUrl("https://[::1]/logo.png", options).reason,
    "private-host",
  );
  assert.equal(
    validateIconUrl("https://[::ffff:7f00:1]/logo.png", options).reason,
    "private-host",
  );
});

test("requires HTTPS for cross-origin images", () => {
  const result = validateIconUrl("http://www.cisco.com/logo.png", {
    baseUrl: productionPage,
  });

  assert.equal(result.reason, "insecure-cross-origin");
});

test("applies the same bounded HTTPS policy to information frames", () => {
  assert.deepEqual(
    validateFrameUrl("https://example.com/status", {
      baseUrl: productionPage,
      maximumLength: 400,
    }),
    { ok: true, url: "https://example.com/status" },
  );
  assert.equal(
    validateFrameUrl("javascript:alert(1)", { baseUrl: productionPage }).reason,
    "unsupported-scheme",
  );
  assert.equal(
    validateFrameUrl("https://127.0.0.1/status", { baseUrl: productionPage }).reason,
    "private-host",
  );
});

test("permits validated HTTPS frames in the production policy", () => {
  assert.match(CONTENT_SECURITY_POLICY, /frame-src 'self' https:/);
  assert.doesNotMatch(CONTENT_SECURITY_POLICY, /unsafe-inline|unsafe-eval/);
});
