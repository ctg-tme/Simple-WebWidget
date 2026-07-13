import "@momentum-design/tokens/dist/css/theme/webex/light-stable.css";
import "@momentum-design/tokens/dist/css/typography/complete.css";
import "@momentum-design/tokens/dist/css/elevation/complete.css";
import weatherIconUrl from "@momentum-design/icons/dist/svg/temperature-regular.svg";
import "./style.css";

const elements = {
  header: document.querySelector("#header"),
  heading: document.querySelector("#heading"),
  conditions: document.querySelector("#conditions"),
  weatherIcon: document.querySelector("#weather-icon"),
  temperature: document.querySelector("#temperature"),
  conditionsDivider: document.querySelector("#conditions-divider"),
  localTime: document.querySelector("#local-time"),
  info1: document.querySelector("#info-1"),
  info2: document.querySelector("#info-2"),
  brandableBlock: document.querySelector("#brandable-block"),
  info3: document.querySelector("#info-3"),
  configurationMessage: document.querySelector("#configuration-message"),
  footer: document.querySelector("#footer"),
  footerYear: document.querySelector("#footer-year"),
  brand: document.querySelector("#brand"),
  brandImage: document.querySelector("#brand-image"),
};

let timeFormatter = null;

function readText(params, name) {
  return params.get(name)?.trim() ?? "";
}

function readBoolean(params, name) {
  return readText(params, name).toLowerCase() === "true";
}

function setText(element, value) {
  element.textContent = value;
  element.hidden = value.length === 0;
  return !element.hidden;
}

function createTimeFormatter(timeZone) {
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  };

  if (timeZone) {
    options.timeZone = timeZone;
  }

  try {
    return new Intl.DateTimeFormat(undefined, options);
  } catch {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  }
}

function updateTime() {
  if (timeFormatter) {
    elements.localTime.textContent = timeFormatter.format(new Date());
  }
}

function renderFromHash() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const legacyMessage = readText(params, "message");
  const iconUrl = readText(params, "iconUrl");
  const showHeading = setText(elements.heading, readText(params, "heading"));
  const showWeather = readBoolean(params, "weather");
  const showTime = readBoolean(params, "time");

  elements.weatherIcon.hidden = !showWeather;
  const showTemperature = setText(
    elements.temperature,
    showWeather ? readText(params, "temp") : "",
  );
  const hasWeatherContent = showWeather || showTemperature;

  timeFormatter = showTime ? createTimeFormatter(readText(params, "timeZone")) : null;
  elements.localTime.hidden = !showTime;
  elements.conditionsDivider.hidden = !(hasWeatherContent && showTime);
  elements.conditions.hidden = !(hasWeatherContent || showTime);
  elements.header.hidden = !(showHeading || hasWeatherContent || showTime);
  updateTime();

  const showInfo1 = setText(elements.info1, readText(params, "info1"));
  const showInfo2 = setText(elements.info2, readText(params, "info2") || legacyMessage);
  const showInfo3 = setText(elements.info3, readText(params, "info3"));

  const hasBrand = iconUrl.length > 0;
  elements.info3.hidden = hasBrand;
  elements.brand.hidden = !hasBrand;
  elements.brandableBlock.hidden = !(hasBrand || showInfo3);

  if (hasBrand) {
    elements.brandImage.src = iconUrl;
  } else {
    elements.brandImage.removeAttribute("src");
  }

  const hasContent =
    showHeading ||
    hasWeatherContent ||
    showTime ||
    showInfo1 ||
    showInfo2 ||
    showInfo3 ||
    hasBrand;

  elements.configurationMessage.hidden = hasContent;
}

elements.weatherIcon.src = weatherIconUrl;
elements.footerYear.textContent = new Date().getFullYear();
renderFromHash();
window.addEventListener("hashchange", renderFromHash);
window.setInterval(updateTime, 30_000);
