export const DEFAULT_THEME = "EveningFjord";

export const SUPPORTED_THEMES = Object.freeze([
  "ArcticNight",
  "Auto",
  "CarbonBlack",
  "ChiliPlum",
  "CrystalMist",
  "EveningFjord",
  "FirstLight",
  "FoggyMoor",
  "Light",
  "MeadowStone",
  "Night",
  "PebbleShoal",
  "PoppyBreeze",
  "SandShoal",
  "SmokedRose",
]);

export const SETTINGS_THEME_OPTIONS = Object.freeze([
  Object.freeze({ value: "", label: `${DEFAULT_THEME} (default)` }),
  ...SUPPORTED_THEMES.filter((theme) => theme !== DEFAULT_THEME).map((theme) =>
    Object.freeze({ value: theme, label: theme }),
  ),
]);

const supportedThemeSet = new Set(SUPPORTED_THEMES);

export function resolveTheme(requestedTheme) {
  return supportedThemeSet.has(requestedTheme) ? requestedTheme : DEFAULT_THEME;
}

export function getThemeSelectionValue(theme) {
  return theme === DEFAULT_THEME ? "" : String(theme ?? "");
}
