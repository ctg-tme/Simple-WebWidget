import { parseWidgetConfiguration } from "./config.js";
import { logRuntimeWarning } from "./logger.js";
import {
  readInformationSetting,
  serializeWidgetSettings,
} from "./settings.js";
import { DEFAULT_THEME, SUPPORTED_THEMES } from "./themes.js";

const FALLBACK_TIME_ZONES = Object.freeze([
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
]);

function getDeviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
}

function getSupportedTimeZones() {
  try {
    if (typeof Intl.supportedValuesOf === "function") {
      return Intl.supportedValuesOf("timeZone");
    }
  } catch {
    // Fall through to a compact, widely supported list.
  }

  return FALLBACK_TIME_ZONES;
}

function addOption(select, value, label = value) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.append(option);
}

function populateThemeOptions(select) {
  select.replaceChildren();
  addOption(select, "", `${DEFAULT_THEME} (default)`);

  for (const theme of SUPPORTED_THEMES) {
    addOption(select, theme);
  }
}

function populateTimeZoneOptions(select) {
  select.replaceChildren();
  const deviceTimeZone = getDeviceTimeZone();
  const automaticLabel = deviceTimeZone
    ? `Device time zone (${deviceTimeZone})`
    : "Device time zone (automatic)";
  addOption(select, "", automaticLabel);

  const zones = new Set(getSupportedTimeZones());

  if (deviceTimeZone) {
    zones.add(deviceTimeZone);
  }

  for (const zone of [...zones].sort()) {
    addOption(select, zone);
  }
}

function ensureSelectValue(select, value) {
  const normalizedValue = String(value ?? "");

  if (
    normalizedValue &&
    ![...select.options].some((option) => option.value === normalizedValue)
  ) {
    addOption(select, normalizedValue);
  }

  select.value = normalizedValue;
}

function createInformationEditors(container, template) {
  const editors = [];

  for (let position = 1; position <= 3; position += 1) {
    const fragment = template.content.cloneNode(true);
    const root = fragment.querySelector(".settings-information");
    const editor = {
      root,
      type: root.querySelector("[data-information-type]"),
      textPanel: root.querySelector('[data-information-panel="text"]'),
      iframePanel: root.querySelector('[data-information-panel="iframe"]'),
      countdownPanel: root.querySelector('[data-information-panel="countdown"]'),
      text: root.querySelector("[data-information-text]"),
      url: root.querySelector("[data-information-url]"),
      countdownTarget: root.querySelector("[data-countdown-target]"),
      countdownTitle: root.querySelector("[data-countdown-title]"),
      countdownEnd: root.querySelector("[data-countdown-end]"),
      countdownTheme: root.querySelector("[data-countdown-theme]"),
    };

    root.querySelector("[data-information-legend]").textContent =
      `Information block ${position}`;
    root.dataset.position = String(position);

    const syncPanels = () => {
      const type = editor.type.value;
      editor.textPanel.hidden = type !== "text";
      editor.iframePanel.hidden = type !== "iframe";
      editor.countdownPanel.hidden = type !== "countdown";
      editor.text.required = type === "text";
      editor.url.required = type === "iframe";
      editor.countdownTarget.required = type === "countdown";
    };

    editor.syncPanels = syncPanels;
    editor.type.addEventListener("change", syncPanels);
    container.append(root);
    editors.push(editor);
  }

  return editors;
}

function setInformationEditor(editor, value, frameUrl) {
  const setting = readInformationSetting(value, frameUrl);
  editor.type.value = setting.type;
  editor.text.value = setting.type === "text" ? setting.value : "";
  editor.url.value = setting.type === "iframe" ? setting.value : "";
  editor.countdownTarget.value = setting.countdown?.target ?? "";
  editor.countdownTitle.value = setting.countdown?.title ?? "";
  editor.countdownEnd.value = setting.countdown?.endMessage ?? "";
  editor.countdownTheme.value = setting.countdown?.theme ?? "dark";
  editor.syncPanels();
}

function readInformationEditor(editor) {
  const type = editor.type.value;

  if (type === "text") {
    return { type, value: editor.text.value };
  }

  if (type === "iframe") {
    return { type, value: editor.url.value };
  }

  if (type === "countdown") {
    return {
      type,
      countdown: {
        target: editor.countdownTarget.value,
        title: editor.countdownTitle.value,
        endMessage: editor.countdownEnd.value,
        theme: editor.countdownTheme.value,
      },
    };
  }

  return { type: "none" };
}

export function createSettingsController({
  onApply,
  onPreview,
  onCancel,
  getConfiguration,
}) {
  const elements = {
    button: document.querySelector("#settings-button"),
    modal: document.querySelector("#settings-modal"),
    close: document.querySelector("#settings-close"),
    cancel: document.querySelector("#settings-cancel"),
    form: document.querySelector("#settings-form"),
    formError: document.querySelector("#settings-form-error"),
    theme: document.querySelector("#setting-theme"),
    heading: document.querySelector("#setting-heading"),
    iconUrl: document.querySelector("#setting-icon-url"),
    weather: document.querySelector("#setting-weather"),
    weatherSettings: document.querySelector("#weather-settings"),
    latitude: document.querySelector("#setting-latitude"),
    longitude: document.querySelector("#setting-longitude"),
    temperatureUnit: document.querySelector("#setting-temperature-unit"),
    useDeviceLocation: document.querySelector("#use-device-location"),
    locationStatus: document.querySelector("#location-status"),
    time: document.querySelector("#setting-time"),
    timeSettings: document.querySelector("#time-settings"),
    timeZone: document.querySelector("#setting-time-zone"),
    hideSettings: document.querySelector("#setting-hide-settings"),
    informationSettings: document.querySelector("#information-settings"),
    informationTemplate: document.querySelector("#information-setting-template"),
  };
  const informationEditors = createInformationEditors(
    elements.informationSettings,
    elements.informationTemplate,
  );
  let previouslyFocused = null;
  let winterOverride = null;
  let closeTimer = null;
  let previewTimer = null;

  populateThemeOptions(elements.theme);
  populateTimeZoneOptions(elements.timeZone);

  function syncWeatherFields() {
    const enabled = elements.weather.checked;
    elements.weatherSettings.hidden = !enabled;
    elements.latitude.required = enabled;
    elements.longitude.required = enabled;
  }

  function syncTimeFields() {
    elements.timeSettings.hidden = !elements.time.checked;
  }

  function setConfiguration(configuration) {
    const value = configuration ?? {};
    winterOverride = value.winter ?? null;
    ensureSelectValue(elements.theme, value.theme ?? "");
    elements.heading.value = value.heading ?? "";
    elements.iconUrl.value = value.iconUrl ?? "";
    elements.weather.checked = value.weather === true;
    elements.latitude.value = value.latitude ?? "";
    elements.longitude.value = value.longitude ?? "";
    elements.temperatureUnit.value =
      String(value.temperatureUnit ?? "").toLowerCase() === "celsius"
        ? "celsius"
        : "fahrenheit";
    elements.time.checked = value.time === true;
    ensureSelectValue(elements.timeZone, value.timeZone ?? "");
    elements.hideSettings.checked = value.hideSettings === true;

    for (let index = 0; index < informationEditors.length; index += 1) {
      const name = `info${index + 1}`;
      setInformationEditor(
        informationEditors[index],
        value[name] ?? "",
        value[`${name}Url`] ?? "",
      );
    }

    elements.locationStatus.textContent = "";
    elements.formError.hidden = true;
    elements.formError.textContent = "";
    syncWeatherFields();
    syncTimeFields();
  }

  function open() {
    window.clearTimeout(closeTimer);
    setConfiguration(getConfiguration());
    previouslyFocused = document.activeElement;
    elements.modal.hidden = false;
    document.body.classList.add("settings-open");
    elements.button.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(() => {
      elements.modal.classList.add("settings-drawer--open");
    });
    elements.close.focus();
  }

  function close({ restorePreview = true } = {}) {
    window.clearTimeout(previewTimer);
    window.clearTimeout(closeTimer);
    elements.modal.classList.remove("settings-drawer--open");
    document.body.classList.remove("settings-open");
    elements.button.setAttribute("aria-expanded", "false");

    if (restorePreview) {
      onCancel();
    }

    closeTimer = window.setTimeout(() => {
      elements.modal.hidden = true;
    }, 260);

    if (previouslyFocused instanceof HTMLElement) {
      previouslyFocused.focus();
    }
  }

  function readSettings() {
    return {
      theme: elements.theme.value,
      heading: elements.heading.value,
      iconUrl: elements.iconUrl.value,
      weather: elements.weather.checked,
      latitude: elements.latitude.value,
      longitude: elements.longitude.value,
      temperatureUnit: elements.temperatureUnit.value,
      time: elements.time.checked,
      timeZone: elements.timeZone.value,
      info1: readInformationEditor(informationEditors[0]),
      info2: readInformationEditor(informationEditors[1]),
      info3: readInformationEditor(informationEditors[2]),
      hideSettings: elements.hideSettings.checked,
      winter: winterOverride,
    };
  }

  function previewSettings() {
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => {
      try {
        const fragment = serializeWidgetSettings(readSettings());
        const configuration = parseWidgetConfiguration(fragment, {
          baseUrl: window.location.href,
          isDevelopment: import.meta.env.DEV,
        });
        elements.formError.hidden = true;
        onPreview(configuration);
      } catch {
        // Incomplete fields are expected while the user is typing. Keep the
        // last valid preview until the form becomes valid again.
      }
    }, 120);
  }

  function useDeviceLocation() {
    elements.locationStatus.textContent = "Requesting this device’s location…";

    if (!navigator.geolocation) {
      elements.locationStatus.textContent =
        "Device location is unavailable. Enter latitude and longitude manually.";
      return;
    }

    elements.useDeviceLocation.disabled = true;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        elements.latitude.value = coords.latitude.toFixed(6);
        elements.longitude.value = coords.longitude.toFixed(6);
        elements.locationStatus.textContent = "Device coordinates added.";
        elements.useDeviceLocation.disabled = false;
        previewSettings();
      },
      (error) => {
        elements.locationStatus.textContent =
          "Device location was not available. Enter coordinates manually.";
        elements.useDeviceLocation.disabled = false;
        logRuntimeWarning(
          "settings-location-unavailable",
          "Device location could not be used for weather settings.",
          error,
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 15 * 60_000 },
    );
  }

  elements.button.addEventListener("click", open);
  elements.close.addEventListener("click", () => close());
  elements.cancel.addEventListener("click", () => close());
  elements.weather.addEventListener("change", syncWeatherFields);
  elements.time.addEventListener("change", syncTimeFields);
  elements.useDeviceLocation.addEventListener("click", useDeviceLocation);
  elements.form.addEventListener("input", previewSettings);
  elements.form.addEventListener("change", previewSettings);
  elements.modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });
  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    elements.formError.hidden = true;

    try {
      const fragment = serializeWidgetSettings(readSettings());
      parseWidgetConfiguration(fragment, {
        baseUrl: window.location.href,
        isDevelopment: import.meta.env.DEV,
      });
      window.clearTimeout(previewTimer);
      close({ restorePreview: false });
      onApply(fragment);
    } catch (error) {
      elements.formError.textContent =
        "This configuration could not be applied. Review the highlighted fields and try again.";
      elements.formError.hidden = false;
      logRuntimeWarning(
        error?.code ?? "settings-configuration-invalid",
        "Settings could not be applied.",
        error,
      );
    }
  });

  return Object.freeze({ open, close });
}
