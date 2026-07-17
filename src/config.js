import {
  ICON_URL_MAX_LENGTH,
  validateFrameUrl,
  validateIconUrl,
} from "./security.js";

export const INPUT_LIMITS = Object.freeze({
  fragment: 8192,
  heading: 80,
  timeZone: 64,
  information: 400,
  iconUrl: ICON_URL_MAX_LENGTH,
  theme: 32,
  coordinate: 24,
  temperatureUnit: 16,
  xLaunch: 64,
  boolean: 5,
});

export const SUPPORTED_HASH_PARAMETERS = Object.freeze([
  "theme",
  "heading",
  "weather",
  "latitude",
  "longitude",
  "temperatureUnit",
  "time",
  "timeZone",
  "info1",
  "info2",
  "info3",
  "iconUrl",
  "hideSettings",
  "winter",
  "xLaunch",
]);

const supportedHashParameterSet = new Set(SUPPORTED_HASH_PARAMETERS);

export class WidgetConfigurationError extends Error {
  constructor(code) {
    super("Widget configuration is invalid");
    this.name = "WidgetConfigurationError";
    this.code = code;
  }
}

function invalid(code) {
  throw new WidgetConfigurationError(code);
}

function readLimitedText(params, name, maximumLength) {
  const value = params.get(name)?.trim() ?? "";

  if (value.length > maximumLength) {
    invalid(`${name}-too-long`);
  }

  return value;
}

function readMultilineText(params, name) {
  return readLimitedText(params, name, INPUT_LIMITS.information)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\\n/g, "\n");
}

const INFORMATION_URL_PATTERN = /^(?:https?:|javascript:|data:|file:|\.{0,2}\/)/i;

function readInformation(params, name, { baseUrl, isDevelopment }) {
  const value = readMultilineText(params, name);

  if (!value || !INFORMATION_URL_PATTERN.test(value)) {
    return { value, url: "" };
  }

  const validation = validateFrameUrl(value, {
    baseUrl,
    isDevelopment,
    maximumLength: INPUT_LIMITS.information,
  });

  if (!validation.ok) {
    invalid(`${name}-url-${validation.reason}`);
  }

  return { value, url: validation.url };
}

function readBoolean(params, name) {
  const value = readLimitedText(params, name, INPUT_LIMITS.boolean).toLowerCase();

  if (!value) {
    return false;
  }

  if (value !== "true" && value !== "false") {
    invalid(`${name}-invalid`);
  }

  return value === "true";
}

function readOptionalBoolean(params, name) {
  if (!params.has(name)) {
    return null;
  }

  return readBoolean(params, name);
}

function readCoordinate(params, name, minimum, maximum) {
  const rawValue = readLimitedText(params, name, INPUT_LIMITS.coordinate);

  if (!rawValue) {
    return null;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    invalid(`${name}-invalid`);
  }

  return value;
}

function assertWellFormedEncoding(fragment) {
  try {
    decodeURIComponent(fragment.replace(/\+/g, "%20"));
  } catch {
    invalid("malformed-encoding");
  }
}

function assertSupportedParameters(params) {
  const seen = new Set();

  for (const [name] of params) {
    if (!supportedHashParameterSet.has(name)) {
      invalid("unsupported-parameter");
    }

    if (seen.has(name)) {
      invalid("duplicate-parameter");
    }

    seen.add(name);
  }
}

export function parseWidgetConfiguration(
  rawFragment,
  { baseUrl, isDevelopment = false } = {},
) {
  const rawValue = String(rawFragment ?? "");
  const prefixLength = rawValue.startsWith("#") ? 1 : 0;

  if (rawValue.length - prefixLength > INPUT_LIMITS.fragment) {
    invalid("fragment-too-long");
  }

  const fragment = prefixLength ? rawValue.slice(1) : rawValue;
  assertWellFormedEncoding(fragment);
  const params = new URLSearchParams(fragment);
  assertSupportedParameters(params);
  const iconUrlValue = readLimitedText(params, "iconUrl", INPUT_LIMITS.iconUrl);
  let iconUrl = "";

  if (iconUrlValue) {
    const validation = validateIconUrl(iconUrlValue, {
      baseUrl,
      isDevelopment,
      maximumLength: INPUT_LIMITS.iconUrl,
    });

    if (!validation.ok) {
      invalid(`icon-url-${validation.reason}`);
    }

    iconUrl = validation.url;
  }

  const weather = readBoolean(params, "weather");
  const latitude = readCoordinate(params, "latitude", -90, 90);
  const longitude = readCoordinate(params, "longitude", -180, 180);

  if ((latitude === null) !== (longitude === null)) {
    invalid("incomplete-coordinates");
  }

  if (weather && latitude === null) {
    invalid("weather-coordinates-required");
  }

  const informationOptions = { baseUrl, isDevelopment };
  const info1 = readInformation(params, "info1", informationOptions);
  const info2 = readInformation(params, "info2", informationOptions);
  const info3 = readInformation(params, "info3", informationOptions);

  return Object.freeze({
    theme: readLimitedText(params, "theme", INPUT_LIMITS.theme),
    heading: readLimitedText(params, "heading", INPUT_LIMITS.heading),
    weather,
    latitude,
    longitude,
    temperatureUnit: readLimitedText(
      params,
      "temperatureUnit",
      INPUT_LIMITS.temperatureUnit,
    ),
    time: readBoolean(params, "time"),
    timeZone: readLimitedText(params, "timeZone", INPUT_LIMITS.timeZone),
    info1: info1.value,
    info1Url: info1.url,
    info2: info2.value,
    info2Url: info2.url,
    info3: info3.value,
    info3Url: info3.url,
    iconUrl,
    hideSettings: readBoolean(params, "hideSettings"),
    winter: readOptionalBoolean(params, "winter"),
    xLaunch: readLimitedText(params, "xLaunch", INPUT_LIMITS.xLaunch),
  });
}
