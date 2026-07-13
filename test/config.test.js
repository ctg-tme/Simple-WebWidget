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
    "#heading=East%20Coast&weather=true&latitude=40.7&longitude=-74" +
      "&time=true&timeZone=America%2FNew_York&info1=Line%201%0ALine%202" +
      "&iconUrl=.%2Fbrand.png",
    options,
  );

  assert.equal(configuration.heading, "East Coast");
  assert.equal(configuration.weather, true);
  assert.equal(configuration.info1, "Line 1\nLine 2");
  assert.equal(configuration.info1Url, "");
  assert.equal(
    configuration.iconUrl,
    "https://example.github.io/Simple-WebWidget/brand.png",
  );
});

test("recognizes validated HTTPS information URLs for iframe rendering", () => {
  const configuration = parseWidgetConfiguration(
    "#info1=https%3A%2F%2Fexample.com%2Fstatus" +
      "&info2=Plain%20text&info3=https%3A%2F%2Fwww.cisco.com%2F",
    options,
  );

  assert.equal(configuration.info1, "https://example.com/status");
  assert.equal(configuration.info1Url, "https://example.com/status");
  assert.equal(configuration.info2, "Plain text");
  assert.equal(configuration.info2Url, "");
  assert.equal(configuration.info3Url, "https://www.cisco.com/");
});

test("accepts a GitHub branding URL with coordinate-driven weather", () => {
  const configuration = parseWidgetConfiguration(
    "#heading=Visitor%20Information&weather=true" +
      "&latitude=40.7128&longitude=-74.0060&time=true" +
      "&timeZone=America%2FNew_York" +
      "&info1=Welcome%20to%20the%20collaboration%20space" +
      "&iconUrl=https%3A%2F%2Fgithub.com%2FWebexSamples.png%3Fsize%3D256" +
      "&theme=ChiliPlum",
    {
      baseUrl: "http://10.0.0.25:5173/",
      isDevelopment: true,
    },
  );

  assert.equal(configuration.latitude, 40.7128);
  assert.equal(configuration.longitude, -74.006);
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

test("rejects unsafe information URL schemes without affecting ordinary text", () => {
  assertInvalid(
    "#info1=javascript%3Aalert%281%29",
    "info1-url-unsupported-scheme",
  );
  assertInvalid(
    "#info2=http%3A%2F%2Fexample.com%2Fstatus",
    "info2-url-insecure-cross-origin",
  );

  const configuration = parseWidgetConfiguration("#info3=Note%3A%20bring%20a%20cable", options);
  assert.equal(configuration.info3, "Note: bring a cable");
  assert.equal(configuration.info3Url, "");
});

test("rejects invalid or incomplete coordinates", () => {
  assertInvalid("#latitude=91&longitude=0", "latitude-invalid");
  assertInvalid("#latitude=40.7", "incomplete-coordinates");
  assertInvalid("#weather=true", "weather-coordinates-required");
});

test("ignores legacy manual weather overrides", () => {
  const configuration = parseWidgetConfiguration(
    "#weather=true&latitude=40.7&longitude=-74" +
      "&weatherSymbol=%E2%9B%85&temp=120%C2%B0F",
    options,
  );

  assert.equal("weatherSymbol" in configuration, false);
  assert.equal("temperature" in configuration, false);
});
