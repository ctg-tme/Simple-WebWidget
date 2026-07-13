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

const supportedThemeSet = new Set(SUPPORTED_THEMES);

export function resolveTheme(requestedTheme) {
  return supportedThemeSet.has(requestedTheme) ? requestedTheme : DEFAULT_THEME;
}
