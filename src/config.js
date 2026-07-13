import { ICON_URL_MAX_LENGTH, validateIconUrl } from "./security.js";

export const INPUT_LIMITS = Object.freeze({
  fragment: 8192,
  heading: 80,
  temperature: 16,
  timeZone: 64,
  information: 400,
  iconUrl: ICON_URL_MAX_LENGTH,
  theme: 32,
  coordinate: 24,
  temperatureUnit: 16,
  boolean: 5,
});

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

function readBoolean(params, name) {
  return (
    readLimitedText(params, name, INPUT_LIMITS.boolean).toLowerCase() ===
    "true"
  );
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

  const latitude = readCoordinate(params, "latitude", -90, 90);
  const longitude = readCoordinate(params, "longitude", -180, 180);

  if ((latitude === null) !== (longitude === null)) {
    invalid("incomplete-coordinates");
  }

  return Object.freeze({
    theme: readLimitedText(params, "theme", INPUT_LIMITS.theme),
    heading: readLimitedText(params, "heading", INPUT_LIMITS.heading),
    weather: readBoolean(params, "weather"),
    temperature: readLimitedText(params, "temp", INPUT_LIMITS.temperature),
    latitude,
    longitude,
    temperatureUnit: readLimitedText(
      params,
      "temperatureUnit",
      INPUT_LIMITS.temperatureUnit,
    ),
    time: readBoolean(params, "time"),
    timeZone: readLimitedText(params, "timeZone", INPUT_LIMITS.timeZone),
    info1: readMultilineText(params, "info1"),
    info2: readMultilineText(params, "info2"),
    info3: readMultilineText(params, "info3"),
    message: readMultilineText(params, "message"),
    iconUrl,
  });
}
