import { APPROVED_CONNECT_ORIGINS } from "./security.js";

const WEATHER_CONDITIONS = [
  { codes: [0], day: "☀️", night: "🌙", label: "Clear sky" },
  { codes: [1], day: "🌤️", night: "🌙", label: "Mainly clear" },
  { codes: [2], day: "⛅", night: "☁️", label: "Partly cloudy" },
  { codes: [3], day: "☁️", night: "☁️", label: "Overcast" },
  { codes: [45, 48], day: "🌫️", night: "🌫️", label: "Fog" },
  { codes: [51, 53, 55, 56, 57], day: "🌦️", night: "🌧️", label: "Drizzle" },
  { codes: [61, 63, 65, 66, 67], day: "🌧️", night: "🌧️", label: "Rain" },
  { codes: [71, 73, 75, 77], day: "🌨️", night: "🌨️", label: "Snow" },
  { codes: [80, 81, 82], day: "🌦️", night: "🌧️", label: "Rain showers" },
  { codes: [85, 86], day: "🌨️", night: "🌨️", label: "Snow showers" },
  { codes: [95, 96, 99], day: "⛈️", night: "⛈️", label: "Thunderstorm" },
];

export function normalizeTemperatureUnit(value) {
  return ["c", "celsius"].includes(value.toLowerCase())
    ? "celsius"
    : "fahrenheit";
}

export function getWeatherCondition(weatherCode, isDay) {
  const condition = WEATHER_CONDITIONS.find(({ codes }) =>
    codes.includes(Number(weatherCode)),
  );

  if (!condition) {
    return { symbol: "🌡️", label: "Current weather" };
  }

  return {
    symbol: isDay ? condition.day : condition.night,
    label: condition.label,
  };
}

export async function fetchCurrentWeather(
  { latitude, longitude, temperatureUnit },
  fetchWeather = fetch,
) {
  const requestUrl = new URL("/v1/forecast", APPROVED_CONNECT_ORIGINS[0]);
  requestUrl.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,weather_code,is_day",
    temperature_unit: temperatureUnit,
    timezone: "auto",
  });

  const response = await fetchWeather(requestUrl);

  if (!response.ok) {
    throw new Error(`Weather request failed with status ${response.status}`);
  }

  const data = await response.json();
  const temperature = Number(data.current?.temperature_2m);
  const weatherCode = Number(data.current?.weather_code);

  if (!Number.isFinite(temperature) || !Number.isFinite(weatherCode)) {
    throw new Error("Weather response did not include current conditions");
  }

  return {
    condition: getWeatherCondition(weatherCode, data.current?.is_day === 1),
    temperature: Math.round(temperature),
    temperatureUnit: data.current_units?.temperature_2m ?? "",
  };
}
