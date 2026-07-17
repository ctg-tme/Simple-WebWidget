import { init, trackEvent } from "@aptabase/web";
import {
  INPUT_LIMITS,
  SUPPORTED_HASH_PARAMETERS,
} from "./config.js";

export const PAGE_OPENED_EVENT = "page_opened";

const supportedParameterNames = new Set(SUPPORTED_HASH_PARAMETERS);

function hasWellFormedEncoding(fragment) {
  try {
    decodeURIComponent(fragment.replace(/\+/g, "%20"));
    return true;
  } catch {
    return false;
  }
}

export function getParameterNamesInUse(rawFragment) {
  const rawValue = String(rawFragment ?? "");
  const fragment = rawValue.startsWith("#") ? rawValue.slice(1) : rawValue;

  if (
    fragment.length > INPUT_LIMITS.fragment ||
    !hasWellFormedEncoding(fragment)
  ) {
    return [];
  }

  const names = new Set();

  for (const name of new URLSearchParams(fragment).keys()) {
    if (supportedParameterNames.has(name)) {
      names.add(name);
    }
  }

  return [...names].sort();
}

export function createPageOpenedEvent(rawFragment) {
  const parameterNames = getParameterNamesInUse(rawFragment);

  return Object.freeze({
    name: PAGE_OPENED_EVENT,
    properties: Object.freeze({
      parameter_names: parameterNames.length
        ? parameterNames.join(",")
        : "none",
      parameter_count: parameterNames.length,
    }),
  });
}

export async function trackPageOpened(
  rawFragment,
  {
    appKey = import.meta.env?.VITE_APTABASE_APP_KEY ?? "",
    initialize = init,
    track = trackEvent,
  } = {},
) {
  const normalizedAppKey = String(appKey).trim();

  if (!normalizedAppKey) {
    return Object.freeze({ tracked: false, reason: "missing-app-key" });
  }

  const event = createPageOpenedEvent(rawFragment);

  try {
    initialize(normalizedAppKey);
    await track(event.name, event.properties);
    return Object.freeze({ tracked: true });
  } catch {
    return Object.freeze({ tracked: false, reason: "tracking-failed" });
  }
}
