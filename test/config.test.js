import test from "node:test";
import assert from "node:assert/strict";
import {
  INPUT_LIMITS,
  WidgetConfigurationError,
  parseWidgetConfiguration,
} from "../src/config.js";

const options = {
  baseUrl: "https://example.github.io/Simple-WebWidget/",
};

function assertInvalid(fragment, expectedCode) {
  assert.throws(
    () => parseWidgetConfiguration(fragment, options),
    (error) =>
      error instanceof WidgetConfigurationError && error.code === expectedCode,
  );
}

test("parses valid bounded widget configuration", () => {
  const configuration = parseWidgetConfiguration(
    "#heading=East%20Coast&weather=true&temp=82%C2%B0F&time=true" +
      "&timeZone=America%2FNew_York&info1=Line%201%0ALine%202" +
      "&iconUrl=.%2Fbrand.png",
    options,
  );

  assert.equal(configuration.heading, "East Coast");
  assert.equal(configuration.weather, true);
  assert.equal(configuration.info1, "Line 1\nLine 2");
  assert.equal(
    configuration.iconUrl,
    "https://example.github.io/Simple-WebWidget/brand.png",
  );
});

test("accepts a GitHub branding URL and weather symbol", () => {
  const configuration = parseWidgetConfiguration(
    "#heading=Visitor%20Information&weather=true" +
      "&weatherSymbol=%E2%9B%85&temp=82%C2%B0F&time=true" +
      "&timeZone=America%2FNew_York" +
      "&info1=Welcome%20to%20the%20collaboration%20space" +
      "&iconUrl=https%3A%2F%2Fgithub.com%2FWebexSamples.png%3Fsize%3D256" +
      "&theme=ChiliPlum",
    {
      baseUrl: "http://10.0.0.25:5173/",
      isDevelopment: true,
    },
  );

  assert.equal(configuration.weatherSymbol, "⛅");
  assert.equal(
    configuration.iconUrl,
    "https://github.com/WebexSamples.png?size=256",
  );
});

test("rejects the fragment before parsing when the total limit is exceeded", () => {
  assertInvalid("#" + "a".repeat(1_000_000), "fragment-too-long");
});

test("rejects malformed percent encoding", () => {
  assertInvalid("#heading=bad%ZZvalue", "malformed-encoding");
});

test("rejects oversized text fields", () => {
  assertInvalid(
    "#heading=" + "a".repeat(INPUT_LIMITS.heading + 1),
    "heading-too-long",
  );
  assertInvalid(
    "#temp=" + "a".repeat(INPUT_LIMITS.temperature + 1),
    "temp-too-long",
  );
  assertInvalid(
    "#weatherSymbol=" + "a".repeat(INPUT_LIMITS.weatherSymbol + 1),
    "weatherSymbol-too-long",
  );
  assertInvalid(
    "#timeZone=" + "a".repeat(INPUT_LIMITS.timeZone + 1),
    "timeZone-too-long",
  );
  assertInvalid(
    "#info1=" + "a".repeat(INPUT_LIMITS.information + 1),
    "info1-too-long",
  );
});

test("rejects oversized or unsafe icon URLs as invalid configuration", () => {
  assertInvalid(
    "#iconUrl=" + "a".repeat(INPUT_LIMITS.iconUrl + 1),
    "iconUrl-too-long",
  );
  assertInvalid(
    "#iconUrl=javascript%3Aalert%281%29",
    "icon-url-unsupported-scheme",
  );
});

test("rejects invalid or incomplete coordinates", () => {
  assertInvalid("#latitude=91&longitude=0", "latitude-invalid");
  assertInvalid("#latitude=40.7", "incomplete-coordinates");
});
