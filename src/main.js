import "@momentum-design/tokens/dist/css/theme/webex/light-stable.css";
import "@momentum-design/tokens/dist/css/typography/complete.css";
import { resolveTheme } from "./themes.js";
import {
  fetchCurrentWeather,
  normalizeTemperatureUnit,
} from "./weather.js";
import "./style.css";

const elements = {
  header: document.querySelector("#header"),
  heading: document.querySelector("#heading"),
  conditions: document.querySelector("#conditions"),
  weatherSource: document.querySelector("#weather-source"),
  weatherIcon: document.querySelector("#weather-icon"),
  temperature: document.querySelector("#temperature"),
  conditionsDivider: document.querySelector("#conditions-divider"),
  localTime: document.querySelector("#local-time"),
  info1: document.querySelector("#info-1"),
  info2: document.querySelector("#info-2"),
  brandableBlock: document.querySelector("#brandable-block"),
  info3: document.querySelector("#info-3"),
  configurationMessage: document.querySelector("#configuration-message"),
  footer: document.querySelector("#footer"),
  footerYear: document.querySelector("#footer-year"),
  brand: document.querySelector("#brand"),
  brandImage: document.querySelector("#brand-image"),
};

let timeFormatter = null;
let weatherConfiguration = null;
let weatherRequestVersion = 0;

function readText(params, name) {
  return params.get(name)?.trim() ?? "";
}

function readBoolean(params, name) {
  return readText(params, name).toLowerCase() === "true";
}

function readMultilineText(params, name) {
  return readText(params, name)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\\n/g, "\n");
}

function setText(element, value) {
  element.textContent = value;
  element.hidden = value.length === 0;
  return !element.hidden;
}

function readCoordinate(params, name, minimum, maximum) {
  const rawValue = readText(params, name);

  if (!rawValue) {
    return null;
  }

  const value = Number(rawValue);
  return Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : null;
}

function createTimeFormatter(timeZone) {
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  };

  if (timeZone) {
    options.timeZone = timeZone;
  }

  try {
    return new Intl.DateTimeFormat(undefined, options);
  } catch {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  }
}

function updateTime() {
  if (timeFormatter) {
    elements.localTime.textContent = timeFormatter.format(new Date());
  }
}

function syncVisibility() {
  const hasWeather = !elements.weatherSource.hidden || !elements.temperature.hidden;
  const hasTime = !elements.localTime.hidden;

  elements.conditionsDivider.hidden = !(hasWeather && hasTime);
  elements.conditions.hidden = !(hasWeather || hasTime);
  elements.header.hidden = elements.heading.hidden && elements.conditions.hidden;

  const hasContent =
    !elements.header.hidden ||
    !elements.info1.hidden ||
    !elements.info2.hidden ||
    !elements.brandableBlock.hidden;

  elements.configurationMessage.hidden = hasContent;
}

async function updateWeather() {
  if (!weatherConfiguration) {
    return;
  }

  const configuration = weatherConfiguration;
  const requestVersion = ++weatherRequestVersion;

  try {
    const weather = await fetchCurrentWeather(configuration);

    if (
      requestVersion !== weatherRequestVersion ||
      configuration !== weatherConfiguration
    ) {
      return;
    }

    elements.weatherIcon.textContent = weather.condition.symbol;
    elements.weatherSource.dataset.state = "ready";
    elements.weatherSource.href = "https://open-meteo.com/";
    elements.weatherSource.ariaLabel =
      `${weather.condition.label}. Weather data by Open-Meteo.com`;
    elements.weatherSource.title = elements.weatherSource.ariaLabel;
    setText(
      elements.temperature,
      `${weather.temperature}${weather.temperatureUnit}`,
    );
    syncVisibility();
  } catch {
    if (
      requestVersion === weatherRequestVersion &&
      elements.weatherSource.dataset.state === "loading"
    ) {
      elements.weatherSource.hidden = true;
      syncVisibility();
    }
  }
}

function renderFromHash() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  weatherRequestVersion += 1;
  weatherConfiguration = null;
  document.documentElement.dataset.theme = resolveTheme(readText(params, "theme"));

  const legacyMessage = readMultilineText(params, "message");
  const iconUrl = readText(params, "iconUrl");
  setText(elements.heading, readText(params, "heading"));
  const showWeather = readBoolean(params, "weather");
  const showTime = readBoolean(params, "time");

  const latitude = readCoordinate(params, "latitude", -90, 90);
  const longitude = readCoordinate(params, "longitude", -180, 180);
  const canLoadWeather = showWeather && latitude !== null && longitude !== null;

  elements.weatherSource.hidden = !canLoadWeather;
  elements.weatherSource.dataset.state = canLoadWeather ? "loading" : "idle";
  elements.weatherSource.removeAttribute("href");
  elements.weatherSource.ariaLabel = canLoadWeather
    ? "Loading current weather"
    : "";
  elements.weatherSource.title = elements.weatherSource.ariaLabel;
  elements.weatherIcon.textContent = canLoadWeather ? "…" : "";
  setText(
    elements.temperature,
    showWeather ? readText(params, "temp") : "",
  );

  if (canLoadWeather) {
    weatherConfiguration = {
      latitude,
      longitude,
      temperatureUnit: normalizeTemperatureUnit(
        readText(params, "temperatureUnit"),
      ),
    };
  }

  timeFormatter = showTime ? createTimeFormatter(readText(params, "timeZone")) : null;
  elements.localTime.hidden = !showTime;
  updateTime();

  setText(elements.info1, readMultilineText(params, "info1"));
  setText(
    elements.info2,
    readMultilineText(params, "info2") || legacyMessage,
  );
  const showInfo3 = setText(elements.info3, readMultilineText(params, "info3"));

  const hasBrand = iconUrl.length > 0;
  elements.info3.hidden = hasBrand;
  elements.brand.hidden = !hasBrand;
  elements.brandableBlock.hidden = !(hasBrand || showInfo3);
  elements.brandableBlock.classList.toggle("info-block--branding", hasBrand);

  if (hasBrand) {
    elements.brandImage.src = iconUrl;
  } else {
    elements.brandImage.removeAttribute("src");
  }

  syncVisibility();
  void updateWeather();
}

elements.footerYear.textContent = new Date().getFullYear();
renderFromHash();
window.addEventListener("hashchange", renderFromHash);
window.setInterval(updateTime, 30_000);
window.setInterval(updateWeather, 15 * 60_000);
