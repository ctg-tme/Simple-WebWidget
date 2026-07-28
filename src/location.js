import { APPROVED_CONNECT_ORIGINS } from "./security.js";

const GEOCODING_API_ORIGIN = APPROVED_CONNECT_ORIGINS.find(
  (origin) => origin === "https://geocoding-api.open-meteo.com",
);
const COORDINATE_NUMBER_PATTERN =
  "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
const COORDINATE_PAIR_PATTERN = new RegExp(
  `^\\s*(${COORDINATE_NUMBER_PATTERN})\\s*,\\s*(${COORDINATE_NUMBER_PATTERN})\\s*$`,
);
const GOOGLE_HOST_PATTERN =
  /(^|\.)google\.(?:com|[a-z]{2,3}|com\.[a-z]{2}|co\.[a-z]{2})$/i;

export const SHORTENED_MAPS_URL_MESSAGE =
  "Shortened Google Maps links cannot be read. Open the link, then copy the full URL from your browser’s address bar.";

export class LocationInputError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "LocationInputError";
    this.code = code;
  }
}

function inputError(code, message) {
  return new LocationInputError(code, message);
}

function parseCoordinate(value, minimum, maximum) {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && value.trim().length === 0)
  ) {
    throw inputError(
      "coordinates-invalid",
      "Latitude and longitude must be valid numbers.",
    );
  }

  const coordinate = Number(value);

  if (
    !Number.isFinite(coordinate) ||
    coordinate < minimum ||
    coordinate > maximum
  ) {
    throw inputError(
      "coordinates-invalid",
      "Latitude must be between -90 and 90, and longitude must be between -180 and 180.",
    );
  }

  return Object.is(coordinate, -0) ? 0 : coordinate;
}

export function normalizeCoordinatePair(latitude, longitude) {
  return Object.freeze({
    latitude: parseCoordinate(latitude, -90, 90).toFixed(6),
    longitude: parseCoordinate(longitude, -180, 180).toFixed(6),
  });
}

export function getLocationSearchLanguage(language) {
  const match = String(language ?? "")
    .trim()
    .toLowerCase()
    .match(/^[a-z]{2}(?:-|$)/);

  return match?.[0]?.slice(0, 2) ?? "en";
}

function uniqueText(values) {
  const seen = new Set();

  return values.flatMap((value) => {
    const text = String(value ?? "").trim();
    const key = text.toLocaleLowerCase();

    if (!text || seen.has(key)) {
      return [];
    }

    seen.add(key);
    return [text];
  });
}

export function buildLocationLabel(result) {
  const locationParts = uniqueText([
    result?.name,
    result?.admin1,
    result?.country,
  ]);

  if (locationParts.length === 0) {
    throw inputError(
      "location-response-malformed",
      "Location search returned a result without a name.",
    );
  }

  const postcodes = uniqueText(
    Array.isArray(result?.postcodes) ? result.postcodes : [],
  ).slice(0, 3);
  const postcodeContext =
    postcodes.length > 0 ? ` — ${postcodes.join(", ")}` : "";

  return `${locationParts.join(", ")}${postcodeContext}`;
}

function normalizeSearchResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw inputError(
      "location-response-malformed",
      "Location search returned an invalid result.",
    );
  }

  let coordinates;

  try {
    coordinates = normalizeCoordinatePair(result.latitude, result.longitude);
  } catch {
    throw inputError(
      "location-response-malformed",
      "Location search returned invalid coordinates.",
    );
  }

  return Object.freeze({
    label: buildLocationLabel(result),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  });
}

export async function fetchLocationSearch(
  query,
  { language = "en", count = 5, signal } = {},
  fetchLocations = fetch,
) {
  const searchText = String(query ?? "").trim();

  if (searchText.length < 2) {
    throw inputError(
      "location-query-too-short",
      "Enter at least two characters to search.",
    );
  }

  const requestUrl = new URL("/v1/search", GEOCODING_API_ORIGIN);
  requestUrl.search = new URLSearchParams({
    name: searchText,
    count: String(count),
    language: getLocationSearchLanguage(language),
    format: "json",
  });

  const response = await fetchLocations(requestUrl, { signal });

  if (!response.ok) {
    throw inputError(
      "location-request-failed",
      `Location search failed with status ${response.status}.`,
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw inputError(
      "location-response-malformed",
      "Location search returned an unreadable response.",
    );
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw inputError(
      "location-response-malformed",
      "Location search returned an invalid response.",
    );
  }

  if (data.results === undefined) {
    return [];
  }

  if (!Array.isArray(data.results)) {
    throw inputError(
      "location-response-malformed",
      "Location search returned an invalid results list.",
    );
  }

  return data.results.map(normalizeSearchResult);
}

export function createLocationSearchClient(fetchLocations = fetch) {
  let requestVersion = 0;
  let requestController = null;

  async function search(query, options = {}) {
    const version = ++requestVersion;
    requestController?.abort();
    requestController = new AbortController();

    try {
      const results = await fetchLocationSearch(
        query,
        { ...options, signal: requestController.signal },
        fetchLocations,
      );

      return version === requestVersion ? results : null;
    } catch (error) {
      if (version !== requestVersion || error?.name === "AbortError") {
        return null;
      }

      throw error;
    } finally {
      if (version === requestVersion) {
        requestController = null;
      }
    }
  }

  function cancel() {
    requestVersion += 1;
    requestController?.abort();
    requestController = null;
  }

  return Object.freeze({ search, cancel });
}

function parseCoordinateText(value) {
  let decodedValue;

  try {
    decodedValue = decodeURIComponent(value);
  } catch {
    throw inputError(
      "maps-url-malformed",
      "Enter a valid full Google Maps URL.",
    );
  }

  const match = decodedValue.match(COORDINATE_PAIR_PATTERN);

  if (!match) {
    return null;
  }

  return normalizeCoordinatePair(match[1], match[2]);
}

function coordinateKey({ latitude, longitude }) {
  return `${latitude},${longitude}`;
}

function uniqueCoordinatePairs(pairs) {
  return [...new Map(pairs.map((pair) => [coordinateKey(pair), pair])).values()];
}

function oneUnambiguousPair(pairs) {
  const uniquePairs = uniqueCoordinatePairs(pairs);

  if (uniquePairs.length > 1) {
    throw inputError(
      "maps-coordinates-ambiguous",
      "This Google Maps URL contains more than one location. Copy a URL for a single location.",
    );
  }

  return uniquePairs[0] ?? null;
}

function getDecodedPath(url) {
  try {
    return decodeURIComponent(url.pathname);
  } catch {
    throw inputError(
      "maps-url-malformed",
      "Enter a valid full Google Maps URL.",
    );
  }
}

function getPathCoordinatePairs(pathname, pattern) {
  return [...pathname.matchAll(pattern)].map((match) =>
    normalizeCoordinatePair(match[1], match[2]),
  );
}

function isShortenedGoogleMapsUrl(url) {
  const hostname = url.hostname.replace(/\.$/, "").toLowerCase();
  return (
    hostname === "maps.app.goo.gl" ||
    (hostname === "goo.gl" && /^\/maps(?:\/|$)/i.test(url.pathname))
  );
}

function isGoogleMapsUrl(url, decodedPath) {
  const hostname = url.hostname.replace(/\.$/, "").toLowerCase();
  return (
    GOOGLE_HOST_PATTERN.test(hostname) &&
    (/^maps\.google\./i.test(hostname) ||
      /^\/maps(?:\/|$)/i.test(decodedPath))
  );
}

export function parseGoogleMapsUrl(value) {
  let url;

  try {
    url = new URL(String(value ?? "").trim());
  } catch {
    throw inputError(
      "maps-url-malformed",
      "Enter a valid full Google Maps URL.",
    );
  }

  if (isShortenedGoogleMapsUrl(url)) {
    throw inputError("maps-url-shortened", SHORTENED_MAPS_URL_MESSAGE);
  }

  if (url.protocol !== "https:") {
    throw inputError(
      "maps-url-insecure",
      "Google Maps URLs must use HTTPS.",
    );
  }

  const decodedPath = getDecodedPath(url);

  if (!isGoogleMapsUrl(url, decodedPath)) {
    throw inputError(
      "maps-url-not-google",
      "Enter a full URL from Google Maps.",
    );
  }

  const placePattern = new RegExp(
    `!3d(${COORDINATE_NUMBER_PATTERN})!4d(${COORDINATE_NUMBER_PATTERN})(?=!|/|$)`,
    "gi",
  );
  const placeCoordinates = getPathCoordinatePairs(
    decodedPath,
    placePattern,
  );

  if (
    placeCoordinates.length === 0 &&
    (/!3d/i.test(decodedPath) || /!4d/i.test(decodedPath))
  ) {
    throw inputError(
      "maps-coordinates-invalid",
      "The Google Maps URL contains invalid location coordinates.",
    );
  }

  const placeCoordinate = oneUnambiguousPair(placeCoordinates);

  if (placeCoordinate) {
    return placeCoordinate;
  }

  const queryCoordinates = ["query", "q", "center", "viewpoint"].flatMap(
    (parameter) =>
      url.searchParams
        .getAll(parameter)
        .map(parseCoordinateText)
        .filter(Boolean),
  );
  const viewportPattern = new RegExp(
    `@(${COORDINATE_NUMBER_PATTERN})\\s*,\\s*(${COORDINATE_NUMBER_PATTERN})(?=,|/|$)`,
    "gi",
  );
  const viewportCoordinates = getPathCoordinatePairs(
    decodedPath,
    viewportPattern,
  );
  const coordinate = oneUnambiguousPair([
    ...queryCoordinates,
    ...viewportCoordinates,
  ]);

  if (!coordinate) {
    throw inputError(
      "maps-coordinates-missing",
      "This Google Maps URL does not include readable latitude and longitude coordinates.",
    );
  }

  return coordinate;
}
