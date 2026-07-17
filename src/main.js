import "@momentum-design/tokens/dist/css/theme/webex/light-stable.css";
import "@momentum-design/tokens/dist/css/typography/complete.css";
import { trackPageOpened } from "./analytics.js";
import { parseWidgetConfiguration } from "./config.js";
import {
  logConfigurationError,
  logRuntimeWarning,
} from "./logger.js";
import { stripLaunchContextFromFragment } from "./launch-context.js";
import { getInformationFrameSandbox } from "./security.js";
import { createSettingsController } from "./settings-ui.js";
import { resolveTheme } from "./themes.js";
import {
  fetchCurrentWeather,
  normalizeTemperatureUnit,
} from "./weather.js";
import { isWinterActive } from "./winter.js";
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
  info3: document.querySelector("#info-3"),
  configurationMessage: document.querySelector("#configuration-message"),
  configurationGuide: document.querySelector("#configuration-guide"),
  configurationError: document.querySelector("#configuration-error"),
  footer: document.querySelector("#footer"),
  footerYear: document.querySelector("#footer-year"),
  brand: document.querySelector("#brand"),
  brandImage: document.querySelector("#brand-image"),
  settingsButton: document.querySelector("#settings-button"),
  winterEffects: document.querySelector("#winter-effects"),
};

let timeFormatter = null;
let weatherConfiguration = null;
let weatherRequestVersion = 0;
let currentConfiguration = null;
let themeDelayTimer = null;
let themeSwapTimer = null;
let themeCleanupTimer = null;

const THEME_TRANSITION_DELAY_MS = 1_000;
const THEME_CROSSFADE_DURATION_MS = 1_000;

function cancelThemeTransition() {
  window.clearTimeout(themeDelayTimer);
  window.clearTimeout(themeSwapTimer);
  window.clearTimeout(themeCleanupTimer);
  themeDelayTimer = null;
  themeSwapTimer = null;
  themeCleanupTimer = null;
  document.documentElement.classList.remove("theme-transitioning");
}

function applyTheme(theme) {
  const root = document.documentElement;

  if (
    !root.dataset.theme ||
    root.dataset.theme === theme ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    cancelThemeTransition();
    root.dataset.theme = theme;
    return;
  }

  cancelThemeTransition();
  themeDelayTimer = window.setTimeout(() => {
    root.classList.add("theme-transitioning");
    themeSwapTimer = window.setTimeout(() => {
      root.dataset.theme = theme;
    }, THEME_CROSSFADE_DURATION_MS / 2);
    themeCleanupTimer = window.setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, THEME_CROSSFADE_DURATION_MS);
  }, THEME_TRANSITION_DELAY_MS);
}

function setText(element, value) {
  element.textContent = value;
  element.hidden = value.length === 0;
  return !element.hidden;
}

function clearInformationBlock(element) {
  const frame = element.querySelector("iframe");

  if (frame) {
    frame.removeAttribute("src");
  }

  element.replaceChildren();
  delete element.dataset.frameUrl;
  element.classList.remove("info-block--frame");
  element.hidden = true;
}

function hideFailedInformationFrame(element, frame, code, message) {
  if (!element.contains(frame)) {
    return;
  }

  clearInformationBlock(element);
  logRuntimeWarning(code, message);
  syncVisibility();
}

function renderInformationBlock(element, value, frameUrl, position) {
  if (
    frameUrl &&
    element.dataset.frameUrl === frameUrl &&
    element.querySelector("iframe")
  ) {
    element.hidden = false;
    return true;
  }

  clearInformationBlock(element);

  if (!value) {
    return false;
  }

  if (!frameUrl) {
    const textContent = document.createElement("div");
    textContent.className = "info-block__text";
    textContent.textContent = value;
    element.append(textContent);
    element.hidden = false;
    return true;
  }

  const frame = document.createElement("iframe");
  frame.title = `Information block ${position}`;
  frame.referrerPolicy = "no-referrer";
  frame.loading = "eager";
  frame.setAttribute(
    "sandbox",
    getInformationFrameSandbox(frameUrl, { baseUrl: window.location.href }),
  );
  frame.addEventListener(
    "error",
    () => {
      hideFailedInformationFrame(
        element,
        frame,
        "information-frame-load-failed",
        `Information block ${position} could not be loaded.`,
      );
    },
    { once: true },
  );

  element.classList.add("info-block--frame");
  element.dataset.frameUrl = frameUrl;
  element.append(frame);
  element.hidden = false;
  frame.src = frameUrl;
  return true;
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

function syncWinterEffects(override = currentConfiguration?.winter ?? null) {
  const enabled = isWinterActive(override);
  elements.winterEffects.hidden = !enabled;
  document.documentElement.classList.toggle("winter-active", enabled);
}

function syncVisibility() {
  const hasWeather = !elements.weatherSource.hidden || !elements.temperature.hidden;
  const hasTime = !elements.localTime.hidden;

  elements.conditionsDivider.hidden = !(hasWeather && hasTime);
  elements.conditions.hidden = !(hasWeather || hasTime);
  elements.header.hidden =
    elements.brand.hidden && elements.heading.hidden && elements.conditions.hidden;

  const hasContent =
    !elements.header.hidden ||
    !elements.info1.hidden ||
    !elements.info2.hidden ||
    !elements.info3.hidden;

  elements.configurationMessage.hidden = hasContent;

  if (!hasContent) {
    elements.configurationGuide.hidden = false;
    elements.configurationError.hidden = true;
  }
}

function resetRenderedConfiguration({ preserveInformation = false } = {}) {
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
  if (!preserveInformation) {
    clearInformationBlock(elements.info1);
    clearInformationBlock(elements.info2);
    clearInformationBlock(elements.info3);
  }
  elements.brand.hidden = true;
  elements.brandImage.removeAttribute("src");
  elements.configurationGuide.hidden = false;
  elements.configurationError.hidden = true;
  elements.configurationMessage.hidden = false;
  elements.settingsButton.hidden = false;
}

function renderInvalidConfiguration() {
  currentConfiguration = null;
  applyTheme(resolveTheme(""));
  syncWinterEffects(null);
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
      elements.weatherSource.hidden = true;
      setText(elements.temperature, "");
      syncVisibility();
    }
  }
}

function renderConfiguration(configuration) {
  weatherRequestVersion += 1;
  resetRenderedConfiguration({ preserveInformation: true });
  currentConfiguration = configuration;
  applyTheme(resolveTheme(configuration.theme));
  syncWinterEffects(configuration.winter);
  elements.settingsButton.hidden = configuration.hideSettings;
  setText(elements.heading, configuration.heading);

  const canLoadWeather = configuration.weather;

  elements.weatherSource.hidden = !canLoadWeather;
  elements.weatherSource.dataset.state = canLoadWeather ? "loading" : "idle";
  elements.weatherSource.removeAttribute("href");
  elements.weatherSource.ariaLabel = canLoadWeather
    ? "Loading current weather"
    : "";
  elements.weatherSource.title = elements.weatherSource.ariaLabel;
  elements.weatherIcon.textContent = canLoadWeather ? "…" : "";
  setText(elements.temperature, "");

  if (canLoadWeather) {
    weatherConfiguration = {
      latitude: configuration.latitude,
      longitude: configuration.longitude,
      temperatureUnit: normalizeTemperatureUnit(
        configuration.temperatureUnit,
      ),
    };
  }

  timeFormatter = configuration.time
    ? createTimeFormatter(configuration.timeZone)
    : null;
  elements.localTime.hidden = !configuration.time;
  updateTime();

  renderInformationBlock(
    elements.info1,
    configuration.info1,
    configuration.info1Url,
    1,
  );
  renderInformationBlock(
    elements.info2,
    configuration.info2,
    configuration.info2Url,
    2,
  );
  renderInformationBlock(
    elements.info3,
    configuration.info3,
    configuration.info3Url,
    3,
  );

  const hasBrand = configuration.iconUrl.length > 0;
  elements.brand.hidden = true;

  if (hasBrand) {
    elements.brandImage.src = configuration.iconUrl;
  }

  syncVisibility();
  void updateWeather();
}

function renderFromHash() {
  let configuration;

  try {
    configuration = parseWidgetConfiguration(window.location.hash, {
      baseUrl: window.location.href,
      isDevelopment: import.meta.env.DEV,
    });
  } catch (error) {
    weatherRequestVersion += 1;
    resetRenderedConfiguration();
    logConfigurationError(error);
    renderInvalidConfiguration();
    return;
  }

  renderConfiguration(configuration);
}

elements.brandImage.addEventListener("load", () => {
  if (elements.brandImage.hasAttribute("src")) {
    elements.brand.hidden = false;
    syncVisibility();
  }
});

elements.brandImage.addEventListener("error", () => {
  if (elements.brandImage.hasAttribute("src")) {
    logRuntimeWarning(
      "branding-image-load-failed",
      "The branding image could not be loaded.",
    );
    elements.brandImage.removeAttribute("src");
    elements.brand.hidden = true;
    syncVisibility();
  }
});

elements.footerYear.textContent = new Date().getFullYear();
createSettingsController({
  getConfiguration: () => currentConfiguration,
  onPreview: renderConfiguration,
  onCancel: renderFromHash,
  onApply: (fragment) => {
    if (fragment === window.location.hash) {
      renderFromHash();
      return;
    }

    if (fragment) {
      window.location.hash = fragment;
      return;
    }

    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    renderFromHash();
  },
});
const initialFragment = window.location.hash;
renderFromHash();
void trackPageOpened(initialFragment).then((result) => {
  if (result.reason === "tracking-failed") {
    logRuntimeWarning(
      "analytics-page-opened-failed",
      "The page-opened analytics event could not be recorded.",
    );
  }
});
const scrubbedInitialFragment = stripLaunchContextFromFragment(initialFragment);

if (scrubbedInitialFragment !== initialFragment) {
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${scrubbedInitialFragment}`,
  );
}

window.addEventListener("hashchange", renderFromHash);
window.setInterval(updateTime, 30_000);
window.setInterval(updateWeather, 15 * 60_000);
window.setInterval(syncWinterEffects, 60 * 60_000);
