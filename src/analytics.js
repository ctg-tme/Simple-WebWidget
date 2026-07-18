import { init, trackEvent } from "@aptabase/web";
import {
  INPUT_LIMITS,
  SUPPORTED_HASH_PARAMETERS,
} from "./config.js";

export const PAGE_OPENED_EVENT = "page_opened";
export const PARAMETER_USED_EVENT = "parameter_used";
export const XLAUNCH_USED_EVENT = "xlaunch_used";

const supportedParameterNames = new Set(SUPPORTED_HASH_PARAMETERS);

function hasWellFormedEncoding(fragment) {
  try {
    decodeURIComponent(fragment.replace(/\+/g, "%20"));
    return true;
  } catch {
    return false;
  }
}

function readFragmentParameters(rawFragment) {
  const rawValue = String(rawFragment ?? "");
  const fragment = rawValue.startsWith("#") ? rawValue.slice(1) : rawValue;

  if (
    fragment.length > INPUT_LIMITS.fragment ||
    !hasWellFormedEncoding(fragment)
  ) {
    return null;
  }

  return new URLSearchParams(fragment);
}

export function getParameterNamesInUse(rawFragment) {
  const params = readFragmentParameters(rawFragment);

  if (!params) {
    return [];
  }

  const names = new Set();

  for (const name of params.keys()) {
    if (supportedParameterNames.has(name)) {
      names.add(name);
    }
  }

  return [...names].sort();
}

export function getLaunchSource(rawFragment) {
  const params = readFragmentParameters(rawFragment);

  if (!params) {
    return "";
  }

  const values = params.getAll("xLaunch");

  if (values.length !== 1) {
    return "";
  }

  const value = values[0].trim();
  return value.length <= INPUT_LIMITS.xLaunch ? value : "";
}

export function createPageOpenedEvent() {
  return Object.freeze({
    name: PAGE_OPENED_EVENT,
    properties: Object.freeze({}),
  });
}

export function createParameterUsedEvents(rawFragment) {
  return Object.freeze(
    getParameterNamesInUse(rawFragment).map((name) =>
      Object.freeze({
        name: PARAMETER_USED_EVENT,
        properties: Object.freeze({ parameter_name: name }),
      }),
    ),
  );
}

export function createLaunchSourceEvent(rawFragment) {
  const launchSource = getLaunchSource(rawFragment);

  if (!launchSource) {
    return null;
  }

  return Object.freeze({
    name: XLAUNCH_USED_EVENT,
    properties: Object.freeze({ launch_source: launchSource }),
  });
}

export function createInitialAnalyticsEvents(rawFragment) {
  const launchSourceEvent = createLaunchSourceEvent(rawFragment);

  return Object.freeze([
    createPageOpenedEvent(),
    ...createParameterUsedEvents(rawFragment),
    ...(launchSourceEvent ? [launchSourceEvent] : []),
  ]);
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

  const events = createInitialAnalyticsEvents(rawFragment);

  try {
    initialize(normalizedAppKey);
    await Promise.all(
      events.map((event) => track(event.name, event.properties)),
    );
    return Object.freeze({ tracked: true });
  } catch {
    return Object.freeze({ tracked: false, reason: "tracking-failed" });
  }
}
