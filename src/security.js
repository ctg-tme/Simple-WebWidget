export const APPROVED_CONNECT_ORIGINS = Object.freeze([
  "https://api.open-meteo.com",
]);

export const ICON_URL_MAX_LENGTH = 2048;

export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data: https:",
  "frame-src 'self' https:",
  `connect-src ${APPROVED_CONNECT_ORIGINS.join(" ")}`,
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

function parseIpv4Literal(hostname) {
  const segments = hostname.replace(/\.$/, "").split(".");

  if (
    segments.length !== 4 ||
    segments.some((segment) => !/^\d{1,3}$/.test(segment))
  ) {
    return null;
  }

  const octets = segments.map(Number);
  return octets.every((octet) => octet >= 0 && octet <= 255)
    ? octets
    : null;
}

function isPrivateIpv4([first, second]) {
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function parseIpv6Literal(hostname) {
  let address = hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (address.includes(".")) {
    const lastColon = address.lastIndexOf(":");
    const ipv4 = parseIpv4Literal(address.slice(lastColon + 1));

    if (!ipv4) {
      return null;
    }

    address = `${address.slice(0, lastColon)}:${(
      (ipv4[0] << 8) |
      ipv4[1]
    ).toString(16)}:${((ipv4[2] << 8) | ipv4[3]).toString(16)}`;
  }

  const halves = address.split("::");

  if (halves.length > 2) {
    return null;
  }

  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;

  if ((halves.length === 1 && missing !== 0) || missing < 0) {
    return null;
  }

  const groups = [
    ...left,
    ...Array(halves.length === 2 ? missing : 0).fill("0"),
    ...right,
  ];

  if (
    groups.length !== 8 ||
    groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))
  ) {
    return null;
  }

  return groups.map((group) => Number.parseInt(group, 16));
}

function isPrivateIpv6(hostname) {
  const groups = parseIpv6Literal(hostname);

  if (!groups) {
    return false;
  }

  const [first] = groups;
  const isUnspecified = groups.every((group) => group === 0);
  const isLoopback = groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1;
  const isIpv4Mapped =
    groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff;
  const isIpv4Compatible = groups.slice(0, 6).every((group) => group === 0);
  const embeddedIpv4 = [
    groups[6] >> 8,
    groups[6] & 0xff,
    groups[7] >> 8,
    groups[7] & 0xff,
  ];

  return (
    isUnspecified ||
    isLoopback ||
    (first & 0xfe00) === 0xfc00 ||
    (first & 0xffc0) === 0xfe80 ||
    (first & 0xff00) === 0xff00 ||
    ((isIpv4Mapped || isIpv4Compatible) && isPrivateIpv4(embeddedIpv4))
  );
}

function isPrivateLiteralHost(hostname) {
  const ipv4 = parseIpv4Literal(hostname);

  if (ipv4) {
    return isPrivateIpv4(ipv4);
  }

  return hostname.startsWith("[") && isPrivateIpv6(hostname);
}

function isLocalDevelopmentOrigin(url, isDevelopment) {
  const hostname = url.hostname.replace(/\.$/, "").toLowerCase();
  return (
    isDevelopment &&
    (hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      isPrivateLiteralHost(url.hostname))
  );
}

function rejection(reason) {
  return { ok: false, reason };
}

function validateRemoteResourceUrl(
  value,
  {
    baseUrl,
    isDevelopment = false,
    maximumLength = ICON_URL_MAX_LENGTH,
  } = {},
) {
  if (typeof value !== "string" || value.length === 0) {
    return rejection("missing");
  }

  if (value.length > maximumLength) {
    return rejection("too-long");
  }

  let pageUrl;
  let iconUrl;

  try {
    pageUrl = new URL(baseUrl);
    iconUrl = new URL(value, pageUrl);
  } catch {
    return rejection("malformed");
  }

  if (iconUrl.username || iconUrl.password) {
    return rejection("credentials");
  }

  if (!["http:", "https:"].includes(iconUrl.protocol)) {
    return rejection("unsupported-scheme");
  }

  const sameOrigin = iconUrl.origin === pageUrl.origin;
  const localDevelopment = isLocalDevelopmentOrigin(pageUrl, isDevelopment);

  const iconHostname = iconUrl.hostname.replace(/\.$/, "").toLowerCase();
  const targetsLocalHost =
    iconHostname === "localhost" ||
    iconHostname.endsWith(".localhost") ||
    isPrivateLiteralHost(iconUrl.hostname);

  if (targetsLocalHost && !(sameOrigin && localDevelopment)) {
    return rejection("private-host");
  }

  if (sameOrigin) {
    if (iconUrl.protocol === "https:" || localDevelopment) {
      return { ok: true, url: iconUrl.href };
    }

    return rejection("insecure-same-origin");
  }

  if (iconUrl.protocol !== "https:") {
    return rejection("insecure-cross-origin");
  }

  return { ok: true, url: iconUrl.href };
}

export function validateIconUrl(value, options) {
  return validateRemoteResourceUrl(value, options);
}

export function validateFrameUrl(value, options) {
  return validateRemoteResourceUrl(value, options);
}

export function getInformationFrameSandbox(value, { baseUrl } = {}) {
  const tokens = ["allow-forms", "allow-popups", "allow-scripts"];

  try {
    const pageUrl = new URL(baseUrl);
    const frameUrl = new URL(value, pageUrl);

    if (frameUrl.origin !== pageUrl.origin) {
      tokens.push("allow-same-origin");
    }
  } catch {
    // URL validation occurs before rendering. Retain the stricter sandbox here.
  }

  return tokens.join(" ");
}
