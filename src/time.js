import { logRuntimeWarning } from "./logger.js";

function getTimeFormatOptions(timeZone, use24HourTime) {
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: use24HourTime ? "h23" : "h12",
  };

  if (timeZone) {
    options.timeZone = timeZone;
  }

  return options;
}

export function createTimeFormatter(timeZone, use24HourTime = false) {
  try {
    return new Intl.DateTimeFormat(
      undefined,
      getTimeFormatOptions(timeZone, use24HourTime),
    );
  } catch {
    logRuntimeWarning(
      "invalid-time-zone",
      "The configured time zone is invalid; using the device time zone.",
    );
    return new Intl.DateTimeFormat(
      undefined,
      getTimeFormatOptions("", use24HourTime),
    );
  }
}
