import { INPUT_LIMITS } from "./config.js";

export const LAUNCH_CONTEXT_PARAMETER = "xLaunch";

function decodeParameterName(segment) {
  const separatorIndex = segment.indexOf("=");
  const encodedName = separatorIndex === -1
    ? segment
    : segment.slice(0, separatorIndex);

  try {
    return decodeURIComponent(encodedName.replace(/\+/g, "%20"));
  } catch {
    return null;
  }
}

export function stripLaunchContextFromFragment(rawFragment) {
  const rawValue = String(rawFragment ?? "");
  const hasPrefix = rawValue.startsWith("#");
  const fragment = hasPrefix ? rawValue.slice(1) : rawValue;

  if (!fragment || fragment.length > INPUT_LIMITS.fragment) {
    return rawValue;
  }

  let removed = false;
  const retainedSegments = fragment.split("&").filter((segment) => {
    if (decodeParameterName(segment) !== LAUNCH_CONTEXT_PARAMETER) {
      return true;
    }

    removed = true;
    return false;
  });

  if (!removed) {
    return rawValue;
  }

  const retainedFragment = retainedSegments.join("&");
  return retainedFragment ? `#${retainedFragment}` : "";
}
