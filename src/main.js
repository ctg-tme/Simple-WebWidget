import "@momentum-design/tokens/dist/css/theme/webex/light-stable.css";
import "@momentum-design/tokens/dist/css/typography/complete.css";
import { parseWidgetConfiguration } from "./config.js";
import {
  logConfigurationError,
  logRuntimeWarning,
} from "./logger.js";
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
  configurationGuide: document.querySelector("#configuration-guide"),
  configurationError: document.querySelector("#configuration-error"),
  footer: document.querySelector("#footer"),
  footerYear: document.querySelector("#footer-year"),
  brand: document.querySelector("#brand"),
  brandImage: document.querySelector("#brand-image"),
};

let timeFormatter = null;
let weatherConfiguration = null;
let weatherRequestVersion = 0;
function setText(element, value) {
  element.textContent = value;
  element.hidden = value.length === 0;
  return !element.hidden;
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
    logRuntimeWarning(
      "invalid-time-zone",
      "The configured time zone is invalid; using the device time zone.",
    );
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

  if (!hasContent) {
    elements.configurationGuide.hidden = false;
    elements.configurationError.hidden = true;
  }
}

function resetRenderedConfiguration() {
  timeFormatter = null;
  weatherConfiguration = null;
  setText(elements.heading, "");
  elements.weatherSource.hidden = true;
  elements.weatherSource.dataset.state = "idle";
  elements.weatherSource.removeAttribute("href");
  elements.weatherSource.removeAttribute("aria-label");
  elements.weatherSource.removeAttribute("title");
  elements.weatherIcon.textContent = "";
  setText(elements.temperature, "");
  elements.localTime.hidden = true;
  elements.localTime.textContent = "";
  setText(elements.info1, "");
  setText(elements.info2, "");
  setText(elements.info3, "");
  elements.brand.hidden = true;
  elements.brandableBlock.hidden = true;
  elements.brandableBlock.classList.remove("info-block--branding");
  elements.brandImage.removeAttribute("src");
  elements.configurationGuide.hidden = false;
  elements.configurationError.hidden = true;
  elements.configurationMessage.hidden = false;
}

function renderInvalidConfiguration() {
  document.documentElement.dataset.theme = resolveTheme("");
  elements.header.hidden = true;
  elements.conditions.hidden = true;
  elements.configurationGuide.hidden = true;
  elements.configurationError.hidden = false;
  elements.configurationMessage.hidden = false;
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
  } catch (error) {
    logRuntimeWarning(
      "weather-update-failed",
      "Current weather could not be loaded.",
      error,
    );

    if (
      requestVersion === weatherRequestVersion &&
      elements.weatherSource.dataset.state === "loading"
    ) {
      if (configuration.fallbackSymbol) {
        elements.weatherSource.dataset.state = "ready";
        elements.weatherSource.ariaLabel = "Current weather";
        elements.weatherSource.title = elements.weatherSource.ariaLabel;
      } else {
        elements.weatherSource.hidden = true;
      }

      syncVisibility();
    }
  }
}

function renderFromHash() {
  weatherRequestVersion += 1;
  resetRenderedConfiguration();

  let configuration;

  try {
    configuration = parseWidgetConfiguration(window.location.hash, {
      baseUrl: window.location.href,
      isDevelopment: import.meta.env.DEV,
    });
  } catch (error) {
    logConfigurationError(error);
    renderInvalidConfiguration();
    return;
  }

  document.documentElement.dataset.theme = resolveTheme(configuration.theme);
  setText(elements.heading, configuration.heading);

  const canLoadWeather =
    configuration.weather &&
    configuration.latitude !== null &&
    configuration.longitude !== null;
  const hasWeatherSymbol =
    configuration.weather && configuration.weatherSymbol.length > 0;

  elements.weatherSource.hidden = !(canLoadWeather || hasWeatherSymbol);
  elements.weatherSource.dataset.state = canLoadWeather
    ? "loading"
    : hasWeatherSymbol
      ? "ready"
      : "idle";
  elements.weatherSource.removeAttribute("href");
  elements.weatherSource.ariaLabel = canLoadWeather
    ? "Loading current weather"
    : hasWeatherSymbol
      ? "Current weather"
      : "";
  elements.weatherSource.title = elements.weatherSource.ariaLabel;
  elements.weatherIcon.textContent = hasWeatherSymbol
    ? configuration.weatherSymbol
    : canLoadWeather
      ? "…"
      : "";
  setText(
    elements.temperature,
    configuration.weather ? configuration.temperature : "",
  );

  if (canLoadWeather) {
    weatherConfiguration = {
      latitude: configuration.latitude,
      longitude: configuration.longitude,
      temperatureUnit: normalizeTemperatureUnit(
        configuration.temperatureUnit,
      ),
      fallbackSymbol: configuration.weatherSymbol,
    };
  }

  timeFormatter = configuration.time
    ? createTimeFormatter(configuration.timeZone)
    : null;
  elements.localTime.hidden = !configuration.time;
  updateTime();

  setText(elements.info1, configuration.info1);
  setText(elements.info2, configuration.info2 || configuration.message);
  const showInfo3 = setText(elements.info3, configuration.info3);

  const hasBrand = configuration.iconUrl.length > 0;
  elements.info3.hidden = hasBrand;
  elements.brand.hidden = !hasBrand;
  elements.brandableBlock.hidden = !(hasBrand || showInfo3);
  elements.brandableBlock.classList.toggle("info-block--branding", hasBrand);

  if (hasBrand) {
    elements.brandImage.src = configuration.iconUrl;
  }

  syncVisibility();
  void updateWeather();
}

elements.brandImage.addEventListener("error", () => {
  if (elements.brandImage.hasAttribute("src")) {
    logRuntimeWarning(
      "branding-image-load-failed",
      "The branding image could not be loaded.",
    );
  }
});

elements.footerYear.textContent = new Date().getFullYear();
renderFromHash();
window.addEventListener("hashchange", renderFromHash);
window.setInterval(updateTime, 30_000);
window.setInterval(updateWeather, 15 * 60_000);
