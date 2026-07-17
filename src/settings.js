import { DEFAULT_THEME } from "./themes.js";

export const H2R_COUNTDOWN_URL = "https://h2r.graphics/tools/countdown/";
export const H2R_COUNTDOWN_THEMES = Object.freeze([
  "dark",
  "light",
  "green",
  "orange",
]);

const INFORMATION_TYPES = new Set(["none", "text", "iframe", "countdown"]);

function appendText(params, name, value) {
  const text = String(value ?? "").trim();

  if (text) {
    params.set(name, text);
  }
}

export function buildH2rCountdownUrl({
  target,
  title,
  endMessage,
  theme,
} = {}) {
  const targetValue = String(target ?? "").trim();

  if (!targetValue) {
    throw new TypeError("An H2R countdown target is required");
  }

  const url = new URL(H2R_COUNTDOWN_URL);
  url.searchParams.set("target", targetValue);
  appendText(url.searchParams, "title", title);
  appendText(url.searchParams, "endMessage", endMessage);

  if (H2R_COUNTDOWN_THEMES.includes(theme)) {
    url.searchParams.set("theme", theme);
  }

  return url.href;
}

export function readInformationSetting(value, frameUrl) {
  if (!value) {
    return { type: "none", value: "", countdown: null };
  }

  if (!frameUrl) {
    return { type: "text", value, countdown: null };
  }

  try {
    const url = new URL(frameUrl);
    const countdownUrl = new URL(H2R_COUNTDOWN_URL);

    if (
      url.origin === countdownUrl.origin &&
      url.pathname === countdownUrl.pathname
    ) {
      return {
        type: "countdown",
        value: frameUrl,
        countdown: {
          target: url.searchParams.get("target") ?? "",
          title: url.searchParams.get("title") ?? "",
          endMessage: url.searchParams.get("endMessage") ?? "",
          theme: H2R_COUNTDOWN_THEMES.includes(url.searchParams.get("theme"))
            ? url.searchParams.get("theme")
            : "dark",
        },
      };
    }
  } catch {
    // The configuration parser validates frame URLs before this function runs.
  }

  return { type: "iframe", value: frameUrl, countdown: null };
}

function appendInformation(params, name, setting = {}) {
  const type = INFORMATION_TYPES.has(setting.type) ? setting.type : "none";

  if (type === "text" || type === "iframe") {
    appendText(params, name, setting.value);
    return;
  }

  if (type === "countdown") {
    params.set(name, buildH2rCountdownUrl(setting.countdown));
  }
}

export function serializeWidgetSettings(settings = {}) {
  const params = new URLSearchParams();

  if (settings.theme && settings.theme !== DEFAULT_THEME) {
    appendText(params, "theme", settings.theme);
  }

  appendText(params, "heading", settings.heading);
  appendText(params, "iconUrl", settings.iconUrl);

  if (settings.weather) {
    params.set("weather", "true");
    appendText(params, "latitude", settings.latitude);
    appendText(params, "longitude", settings.longitude);

    if (settings.temperatureUnit === "celsius") {
      params.set("temperatureUnit", "celsius");
    }
  }

  if (settings.time) {
    params.set("time", "true");
    appendText(params, "timeZone", settings.timeZone);
  }

  appendInformation(params, "info1", settings.info1);
  appendInformation(params, "info2", settings.info2);
  appendInformation(params, "info3", settings.info3);

  if (settings.hideSettings) {
    params.set("hideSettings", "true");
  }

  if (typeof settings.winter === "boolean") {
    params.set("winter", String(settings.winter));
  }

  const fragment = params.toString();
  return fragment ? `#${fragment}` : "";
}
