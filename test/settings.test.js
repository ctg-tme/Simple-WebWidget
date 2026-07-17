import test from "node:test";
import assert from "node:assert/strict";
import { parseWidgetConfiguration } from "../src/config.js";
import {
  H2R_COUNTDOWN_URL,
  buildH2rCountdownUrl,
  readInformationSetting,
  serializeWidgetSettings,
} from "../src/settings.js";

const baseUrl = "https://ctg-tme.github.io/Simple-WebWidget/";

test("omits optional and false settings", () => {
  assert.equal(
    serializeWidgetSettings({
      theme: "EveningFjord",
      weather: false,
      time: false,
      hideSettings: false,
      info1: { type: "none" },
    }),
    "",
  );
});

test("serializes all current settings without legacy parameters", () => {
  const fragment = serializeWidgetSettings({
    theme: "ArcticNight",
    heading: "Visitor information",
    iconUrl: "https://example.com/brand.png",
    weather: true,
    latitude: "40.7128",
    longitude: "-74.0060",
    temperatureUnit: "celsius",
    time: true,
    timeZone: "America/New_York",
    info1: { type: "text", value: "Primary information" },
    info2: { type: "iframe", value: "https://example.com/status" },
    info3: { type: "none" },
    hideSettings: true,
  });
  const configuration = parseWidgetConfiguration(fragment, { baseUrl });

  assert.equal(configuration.theme, "ArcticNight");
  assert.equal(configuration.weather, true);
  assert.equal(configuration.info2Url, "https://example.com/status");
  assert.equal(configuration.hideSettings, true);
  assert.doesNotMatch(fragment, /message|weatherSymbol|temp=/);
});

test("builds and recognizes an official H2R countdown URL", () => {
  const url = buildH2rCountdownUrl({
    target: "2026-09-19T12:00",
    title: "Wave 3",
    endMessage: "Started",
    theme: "dark",
  });
  const parsedUrl = new URL(url);
  const setting = readInformationSetting(url, url);

  assert.equal(parsedUrl.origin + parsedUrl.pathname, H2R_COUNTDOWN_URL);
  assert.equal(parsedUrl.searchParams.get("target"), "2026-09-19T12:00");
  assert.equal(parsedUrl.searchParams.get("endMessage"), "Started");
  assert.equal(setting.type, "countdown");
  assert.equal(setting.countdown.title, "Wave 3");
});

test("requires a target for H2R countdown settings", () => {
  assert.throws(
    () => serializeWidgetSettings({ info1: { type: "countdown" } }),
    /target is required/,
  );
});

test("preserves the hidden winter override when visible settings are applied", () => {
  assert.match(serializeWidgetSettings({ winter: true }), /winter=true/);
  assert.match(serializeWidgetSettings({ winter: false }), /winter=false/);
});

test("does not copy transient xLaunch context into settings output", () => {
  const fragment = serializeWidgetSettings({
    heading: "Updated heading",
    xLaunch: "deployment-portal",
  });
  const configuration = parseWidgetConfiguration(fragment, { baseUrl });

  assert.equal(configuration.heading, "Updated heading");
  assert.equal(configuration.xLaunch, "");
  assert.doesNotMatch(fragment, /xLaunch/);
});
