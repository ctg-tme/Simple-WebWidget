import test from "node:test";
import assert from "node:assert/strict";
import {
  SHORTENED_MAPS_URL_MESSAGE,
  buildLocationLabel,
  createLocationSearchClient,
  fetchLocationSearch,
  getLocationSearchLanguage,
  normalizeCoordinatePair,
  parseGoogleMapsUrl,
} from "../src/location.js";

function jsonResponse(data, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return data;
    },
  };
}

test("builds a properly encoded Open-Meteo location request", async () => {
  let requestUrl;
  let requestOptions;

  const results = await fetchLocationSearch(
    "  São José  ",
    { count: 5, language: "pt-BR" },
    async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return jsonResponse({ results: [] });
    },
  );

  assert.deepEqual(results, []);
  assert.equal(
    requestUrl.origin,
    "https://geocoding-api.open-meteo.com",
  );
  assert.equal(requestUrl.pathname, "/v1/search");
  assert.equal(requestUrl.searchParams.get("name"), "São José");
  assert.equal(requestUrl.searchParams.get("count"), "5");
  assert.equal(requestUrl.searchParams.get("language"), "pt");
  assert.equal(requestUrl.searchParams.get("format"), "json");
  assert.equal(requestOptions.signal, undefined);
});

test("normalizes successful search results and deduplicates labels", async () => {
  const results = await fetchLocationSearch("Raleigh", {}, async () =>
    jsonResponse({
      results: [
        {
          id: 4487042,
          name: "Raleigh",
          admin1: "North Carolina",
          country: "United States",
          latitude: 35.7721,
          longitude: -78.63861,
          postcodes: ["27601", "27601", "27602"],
        },
        {
          name: "Singapore",
          admin1: "Singapore",
          country: "Singapore",
          latitude: 1.28967,
          longitude: 103.85007,
        },
      ],
    }),
  );

  assert.deepEqual(results, [
    {
      label: "Raleigh, North Carolina, United States — 27601, 27602",
      latitude: "35.772100",
      longitude: "-78.638610",
    },
    {
      label: "Singapore",
      latitude: "1.289670",
      longitude: "103.850070",
    },
  ]);
  assert.equal(
    buildLocationLabel({
      name: "Raleigh",
      admin1: "Raleigh",
      country: "United States",
    }),
    "Raleigh, United States",
  );
});

test("uses a reduced browser language with an English fallback", () => {
  assert.equal(getLocationSearchLanguage("fr-CA"), "fr");
  assert.equal(getLocationSearchLanguage("ZH-hans"), "zh");
  assert.equal(getLocationSearchLanguage("not-a-language"), "en");
  assert.equal(getLocationSearchLanguage(), "en");
});

test("requires two trimmed characters before searching", async () => {
  await assert.rejects(
    fetchLocationSearch(" \tA ", {}, async () => jsonResponse({ results: [] })),
    { code: "location-query-too-short" },
  );
});

test("handles missing and empty Open-Meteo results", async () => {
  assert.deepEqual(
    await fetchLocationSearch("Nowhere", {}, async () => jsonResponse({})),
    [],
  );
  assert.deepEqual(
    await fetchLocationSearch("Nowhere", {}, async () =>
      jsonResponse({ results: [] }),
    ),
    [],
  );
});

test("rejects non-OK and malformed Open-Meteo responses", async () => {
  await assert.rejects(
    fetchLocationSearch("Raleigh", {}, async () =>
      jsonResponse({}, { ok: false, status: 503 }),
    ),
    { code: "location-request-failed" },
  );
  await assert.rejects(
    fetchLocationSearch("Raleigh", {}, async () =>
      jsonResponse({ results: "invalid" }),
    ),
    { code: "location-response-malformed" },
  );
  await assert.rejects(
    fetchLocationSearch("Raleigh", {}, async () => ({
      ok: true,
      status: 200,
      async json() {
        throw new SyntaxError("invalid JSON");
      },
    })),
    { code: "location-response-malformed" },
  );
});

test("rejects malformed coordinates in Open-Meteo results", async () => {
  await assert.rejects(
    fetchLocationSearch("Raleigh", {}, async () =>
      jsonResponse({
        results: [
          {
            name: "Raleigh",
            country: "United States",
            latitude: 91,
            longitude: -78.6,
          },
        ],
      }),
    ),
    { code: "location-response-malformed" },
  );
});

test("surfaces Open-Meteo network failures", async () => {
  await assert.rejects(
    fetchLocationSearch("Raleigh", {}, async () => {
      throw new Error("network unavailable");
    }),
    /network unavailable/,
  );
});

test("ignores a stale search after a newer search starts", async () => {
  let resolveFirst;
  const firstResponse = new Promise((resolve) => {
    resolveFirst = resolve;
  });
  const client = createLocationSearchClient(async (url) => {
    if (url.searchParams.get("name") === "Ra") {
      return firstResponse;
    }

    return jsonResponse({
      results: [
        {
          name: "Raleigh",
          country: "United States",
          latitude: 35.7721,
          longitude: -78.63861,
        },
      ],
    });
  });
  const staleSearch = client.search("Ra");
  const currentSearch = client.search("Raleigh");

  resolveFirst(
    jsonResponse({
      results: [
        {
          name: "Rabat",
          country: "Morocco",
          latitude: 34.01325,
          longitude: -6.83255,
        },
      ],
    }),
  );

  assert.equal(await staleSearch, null);
  assert.deepEqual(await currentSearch, [
    {
      label: "Raleigh, United States",
      latitude: "35.772100",
      longitude: "-78.638610",
    },
  ]);
});

test("normalizes valid coordinate boundaries to six decimal places", () => {
  assert.deepEqual(normalizeCoordinatePair(-90, 180), {
    latitude: "-90.000000",
    longitude: "180.000000",
  });
  assert.deepEqual(normalizeCoordinatePair(90, -180), {
    latitude: "90.000000",
    longitude: "-180.000000",
  });
  assert.deepEqual(normalizeCoordinatePair(-0, -0), {
    latitude: "0.000000",
    longitude: "0.000000",
  });
});

test("parses supported Google Maps query parameters", () => {
  assert.deepEqual(
    parseGoogleMapsUrl(
      "https://www.google.com/maps/search/?api=1&query=40.7128%2C-74.0060",
    ),
    { latitude: "40.712800", longitude: "-74.006000" },
  );
  assert.deepEqual(
    parseGoogleMapsUrl("https://maps.google.com/?q=40.7128,-74.0060"),
    { latitude: "40.712800", longitude: "-74.006000" },
  );
  assert.deepEqual(
    parseGoogleMapsUrl(
      "https://www.google.com/maps?center=-33.712206%2C150.311941",
    ),
    { latitude: "-33.712206", longitude: "150.311941" },
  );
  assert.deepEqual(
    parseGoogleMapsUrl(
      "https://www.google.co.uk/maps?viewpoint=46.414382%2C10.013988",
    ),
    { latitude: "46.414382", longitude: "10.013988" },
  );
});

test("parses viewport and place-data Google Maps paths", () => {
  assert.deepEqual(
    parseGoogleMapsUrl(
      "https://www.google.com/maps/place/New+York/@40.7128,-74.0060,15z",
    ),
    { latitude: "40.712800", longitude: "-74.006000" },
  );
  assert.deepEqual(
    parseGoogleMapsUrl(
      "https://www.google.com/maps/place/New+York/data=!3m1!4b1!3d40.713!4d-74.007!16z",
    ),
    { latitude: "40.713000", longitude: "-74.007000" },
  );
});

test("prefers place-data coordinates over a Google Maps viewport", () => {
  assert.deepEqual(
    parseGoogleMapsUrl(
      "https://www.google.com/maps/place/New+York/@40.7000,-74.0000,15z/data=!3m1!4b1!3d40.713!4d-74.007!16z",
    ),
    { latitude: "40.713000", longitude: "-74.007000" },
  );
});

test("decodes encoded Google Maps coordinate values and paths", () => {
  assert.deepEqual(
    parseGoogleMapsUrl(
      "https://www.google.com/maps?q=40.7128%252C-74.0060",
    ),
    { latitude: "40.712800", longitude: "-74.006000" },
  );
  assert.deepEqual(
    parseGoogleMapsUrl(
      "https://www.google.com/maps/place/New+York/%4040.7128%2C-74.0060%2C15z",
    ),
    { latitude: "40.712800", longitude: "-74.006000" },
  );
});

test("parses Google Maps latitude and longitude boundary values", () => {
  assert.deepEqual(
    parseGoogleMapsUrl("https://www.google.com/maps?q=-90,180"),
    { latitude: "-90.000000", longitude: "180.000000" },
  );
  assert.deepEqual(
    parseGoogleMapsUrl("https://www.google.com/maps?q=90,-180"),
    { latitude: "90.000000", longitude: "-180.000000" },
  );
});

test("rejects out-of-range and non-finite Google Maps coordinates", () => {
  assert.throws(
    () => parseGoogleMapsUrl("https://www.google.com/maps?q=90.0001,0"),
    { code: "coordinates-invalid" },
  );
  assert.throws(
    () => parseGoogleMapsUrl("https://www.google.com/maps?q=0,-180.0001"),
    { code: "coordinates-invalid" },
  );
  assert.throws(() =>
    parseGoogleMapsUrl("https://www.google.com/maps?q=Infinity,0"),
  );
});

test("rejects malformed, insecure, non-Google, and address-only URLs", () => {
  assert.throws(() => parseGoogleMapsUrl("not a URL"), {
    code: "maps-url-malformed",
  });
  assert.throws(
    () => parseGoogleMapsUrl("http://www.google.com/maps?q=40.7,-74"),
    { code: "maps-url-insecure" },
  );
  assert.throws(
    () => parseGoogleMapsUrl("https://example.com/maps?q=40.7,-74"),
    { code: "maps-url-not-google" },
  );
  assert.throws(
    () =>
      parseGoogleMapsUrl(
        "https://www.google.com/maps/place/Empire+State+Building",
      ),
    { code: "maps-coordinates-missing" },
  );
});

test("rejects ambiguous Google Maps coordinate pairs", () => {
  assert.throws(
    () =>
      parseGoogleMapsUrl(
        "https://www.google.com/maps?q=40.7128,-74.0060&center=41,-73",
      ),
    { code: "maps-coordinates-ambiguous" },
  );
});

test("recognizes both shortened Google Maps URL forms", () => {
  for (const url of [
    "https://maps.app.goo.gl/AbCdEf",
    "https://goo.gl/maps/AbCdEf",
  ]) {
    assert.throws(
      () => parseGoogleMapsUrl(url),
      (error) =>
        error.code === "maps-url-shortened" &&
        error.message === SHORTENED_MAPS_URL_MESSAGE,
    );
  }
});
