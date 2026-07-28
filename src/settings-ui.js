import { parseWidgetConfiguration } from "./config.js";
import {
  createLocationSearchClient,
  normalizeCoordinatePair,
  parseGoogleMapsUrl,
} from "./location.js";
import { logRuntimeWarning } from "./logger.js";
import {
  readInformationSetting,
  serializeWidgetSettings,
} from "./settings.js";
import {
  SETTINGS_THEME_OPTIONS,
  getThemeSelectionValue,
} from "./themes.js";

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

  for (const { value, label } of SETTINGS_THEME_OPTIONS) {
    addOption(select, value, label);
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
    searchForLocation: document.querySelector("#search-for-location"),
    locationStatus: document.querySelector("#location-status"),
    locationDialog: document.querySelector("#location-search-dialog"),
    locationDialogClose: document.querySelector("#location-search-close"),
    locationDialogCancel: document.querySelector("#location-search-cancel"),
    locationSearchForm: document.querySelector("#location-search-form"),
    locationSearchInput: document.querySelector("#location-search-input"),
    locationSearchSubmit: document.querySelector("#location-search-submit"),
    locationSearchStatus: document.querySelector("#location-search-status"),
    locationSearchResults: document.querySelector(
      "#location-search-results",
    ),
    mapsUrlForm: document.querySelector("#maps-url-form"),
    mapsUrlInput: document.querySelector("#maps-url-input"),
    time: document.querySelector("#setting-time"),
    timeSettings: document.querySelector("#time-settings"),
    twentyFourHourTime: document.querySelector("#setting-24hr-time"),
    timeZone: document.querySelector("#setting-time-zone"),
    hideSettings: document.querySelector("#setting-hide-settings"),
    informationSettings: document.querySelector("#information-settings"),
    informationTemplate: document.querySelector("#information-setting-template"),
  };
  const informationEditors = createInformationEditors(
    elements.informationSettings,
    elements.informationTemplate,
  );
  const locationSearchClient = createLocationSearchClient();
  let previouslyFocused = null;
  let winterOverride = null;
  let closeTimer = null;
  let previewTimer = null;
  let locationUiRequestVersion = 0;

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
    ensureSelectValue(elements.theme, getThemeSelectionValue(value.theme));
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
    elements.twentyFourHourTime.checked = value["24hrTime"] === true;
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

  function setLocationDialogStatus(message, { error = false } = {}) {
    elements.locationSearchStatus.textContent = message;

    if (error) {
      elements.locationSearchStatus.dataset.state = "error";
    } else {
      delete elements.locationSearchStatus.dataset.state;
    }
  }

  function setLocationSearchLoading(loading) {
    elements.locationSearchSubmit.disabled = loading;
    elements.locationSearchSubmit.textContent = loading
      ? "Searching…"
      : "Search";
    elements.locationSearchForm.setAttribute(
      "aria-busy",
      loading ? "true" : "false",
    );
  }

  function setDeviceLocationLoading(loading) {
    elements.useDeviceLocation.disabled = loading;
    elements.useDeviceLocation.textContent = loading
      ? "Locating…"
      : "Use this device’s location";
  }

  function clearLocationSearchResults() {
    elements.locationSearchResults.replaceChildren();
    elements.locationSearchResults.hidden = true;
  }

  function resetLocationDialog() {
    locationUiRequestVersion += 1;
    locationSearchClient.cancel();
    elements.locationSearchForm.reset();
    elements.mapsUrlForm.reset();
    setLocationSearchLoading(false);
    setDeviceLocationLoading(false);
    setLocationDialogStatus("");
    clearLocationSearchResults();
  }

  function openLocationDialog() {
    resetLocationDialog();
    elements.locationDialog.showModal();
    window.requestAnimationFrame(() => {
      elements.locationSearchInput.focus();
    });
  }

  function closeLocationDialog({ restoreFocus = true } = {}) {
    locationUiRequestVersion += 1;
    locationSearchClient.cancel();

    if (elements.locationDialog.open) {
      elements.locationDialog.close();
    }

    if (restoreFocus && !elements.modal.hidden) {
      elements.searchForLocation.focus();
    }
  }

  function close({ restorePreview = true } = {}) {
    window.clearTimeout(previewTimer);
    window.clearTimeout(closeTimer);
    closeLocationDialog({ restoreFocus: false });
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
      "24hrTime": elements.twentyFourHourTime.checked,
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

  function applyCoordinates(latitude, longitude, message) {
    let coordinates;

    try {
      coordinates = normalizeCoordinatePair(latitude, longitude);
    } catch {
      elements.locationStatus.textContent =
        "Those coordinates are not valid. Enter a latitude from -90 to 90 and a longitude from -180 to 180.";
      return false;
    }

    elements.latitude.value = coordinates.latitude;
    elements.longitude.value = coordinates.longitude;
    elements.locationStatus.textContent = message;
    previewSettings();
    return true;
  }

  function useDeviceLocation() {
    const requestVersion = ++locationUiRequestVersion;
    locationSearchClient.cancel();
    setLocationSearchLoading(false);
    setDeviceLocationLoading(true);
    const requestMessage = "Requesting this device’s location…";
    elements.locationStatus.textContent = requestMessage;
    setLocationDialogStatus(requestMessage);

    if (!navigator.geolocation) {
      const unavailableMessage =
        "Device location is unavailable. Enter latitude and longitude manually.";
      elements.locationStatus.textContent = unavailableMessage;
      setLocationDialogStatus(unavailableMessage, { error: true });
      setDeviceLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (
          requestVersion !== locationUiRequestVersion ||
          !elements.locationDialog.open
        ) {
          return;
        }

        const applied = applyCoordinates(
          coords.latitude,
          coords.longitude,
          "Device coordinates added.",
        );
        setDeviceLocationLoading(false);

        if (applied) {
          closeLocationDialog();
        } else {
          setLocationDialogStatus(
            "This device returned invalid coordinates. Search for a location or enter coordinates manually.",
            { error: true },
          );
        }
      },
      (error) => {
        if (
          requestVersion !== locationUiRequestVersion ||
          !elements.locationDialog.open
        ) {
          return;
        }

        const unavailableMessage =
          "Device location was not available. Enter coordinates manually.";
        elements.locationStatus.textContent = unavailableMessage;
        setLocationDialogStatus(unavailableMessage, { error: true });
        setDeviceLocationLoading(false);
        logRuntimeWarning(
          "settings-location-unavailable",
          "Device location could not be used for weather settings.",
          error,
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 15 * 60_000 },
    );
  }

  function renderLocationResults(results) {
    clearLocationSearchResults();

    for (const result of results) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.className = "location-search-result";
      button.type = "button";
      button.textContent = result.label;
      button.addEventListener("click", () => {
        const applied = applyCoordinates(
          result.latitude,
          result.longitude,
          `Coordinates added for ${result.label}.`,
        );

        if (applied) {
          closeLocationDialog();
        }
      });
      item.append(button);
      elements.locationSearchResults.append(item);
    }

    elements.locationSearchResults.hidden = results.length === 0;
  }

  async function searchForLocations(event) {
    event.preventDefault();
    const query = elements.locationSearchInput.value.trim();

    if (query.length < 2) {
      setLocationDialogStatus(
        "Enter at least two characters to search.",
        { error: true },
      );
      clearLocationSearchResults();
      elements.locationSearchInput.focus();
      return;
    }

    const requestVersion = ++locationUiRequestVersion;
    setDeviceLocationLoading(false);
    clearLocationSearchResults();
    setLocationSearchLoading(true);
    setLocationDialogStatus("Searching for locations…");

    try {
      const results = await locationSearchClient.search(query, {
        count: 5,
        language: navigator.language,
      });

      if (
        results === null ||
        requestVersion !== locationUiRequestVersion ||
        !elements.locationDialog.open
      ) {
        return;
      }

      renderLocationResults(results);
      setLocationDialogStatus(
        results.length === 0
          ? "No locations found. Try a nearby city or postal/ZIP code."
          : `${results.length} location${results.length === 1 ? "" : "s"} found. Select one to use its coordinates.`,
      );
    } catch {
      if (
        requestVersion === locationUiRequestVersion &&
        elements.locationDialog.open
      ) {
        clearLocationSearchResults();
        setLocationDialogStatus(
          "Location search is unavailable right now. Check your connection and try again.",
          { error: true },
        );
      }
    } finally {
      if (
        requestVersion === locationUiRequestVersion &&
        elements.locationDialog.open
      ) {
        setLocationSearchLoading(false);
      }
    }
  }

  function useGoogleMapsCoordinates(event) {
    event.preventDefault();
    locationUiRequestVersion += 1;
    locationSearchClient.cancel();
    setLocationSearchLoading(false);
    setDeviceLocationLoading(false);

    try {
      const coordinates = parseGoogleMapsUrl(elements.mapsUrlInput.value);
      const applied = applyCoordinates(
        coordinates.latitude,
        coordinates.longitude,
        "Coordinates added from Google Maps.",
      );

      if (applied) {
        closeLocationDialog();
      }
    } catch (error) {
      setLocationDialogStatus(
        error?.message ??
          "Enter a full Google Maps URL that includes latitude and longitude.",
        { error: true },
      );
      elements.mapsUrlInput.focus();
    }
  }

  elements.button.addEventListener("click", open);
  elements.close.addEventListener("click", () => close());
  elements.cancel.addEventListener("click", () => close());
  elements.weather.addEventListener("change", syncWeatherFields);
  elements.time.addEventListener("change", syncTimeFields);
  elements.useDeviceLocation.addEventListener("click", useDeviceLocation);
  elements.searchForLocation.addEventListener("click", openLocationDialog);
  elements.locationDialogClose.addEventListener("click", () =>
    closeLocationDialog(),
  );
  elements.locationDialogCancel.addEventListener("click", () =>
    closeLocationDialog(),
  );
  elements.locationDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeLocationDialog();
  });
  elements.locationDialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeLocationDialog();
    }
  });
  elements.locationSearchForm.addEventListener("submit", searchForLocations);
  elements.mapsUrlForm.addEventListener("submit", useGoogleMapsCoordinates);
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
