const LOG_PREFIX = "[Simple-WebWidget]";

export function logWidgetIssue(
  level,
  code,
  message,
  { cause, logger = console } = {},
) {
  const details = { code };

  if (cause instanceof Error && cause.message) {
    details.cause = cause.message;
  }

  const method = level === "error" ? logger.error : logger.warn;
  method.call(logger, `${LOG_PREFIX} ${message}`, details);
}

export function logConfigurationError(error) {
  logWidgetIssue(
    "error",
    error?.code ?? "unexpected-configuration-error",
    "Invalid widget configuration.",
  );
}

export function logRuntimeWarning(code, message, cause) {
  logWidgetIssue("warning", code, message, { cause });
}
