import "@momentum-design/tokens/dist/css/theme/webex/light-stable.css";
import "@momentum-design/tokens/dist/css/typography/complete.css";
import "./style.css";

const elements = {
  heading: document.querySelector("#heading"),
  weather: document.querySelector("#weather"),
  temperature: document.querySelector("#temperature"),
  localTime: document.querySelector("#local-time"),
  info1: document.querySelector("#info-1"),
  info2: document.querySelector("#info-2"),
  info3: document.querySelector("#info-3"),
  footer: document.querySelector("#footer"),
  brand: document.querySelector("#brand"),
  brandImage: document.querySelector("#brand-image"),
};

let timeOverride = null;

function readText(params, name, fallback) {
  return params.has(name) ? params.get(name).trim() : fallback;
}

function updateTime() {
  elements.localTime.textContent =
    timeOverride ??
    new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());
}

function renderFromHash() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const legacyMessage = readText(params, "message", "Hello world");
  const iconUrl = readText(params, "iconUrl", "");

  elements.heading.textContent = readText(params, "heading", "Information");
  elements.weather.textContent = readText(params, "weather", "☀️");
  elements.temperature.textContent = readText(params, "temp", "72°");
  elements.info1.textContent = readText(params, "info1", "Info Block 1");
  elements.info2.textContent = readText(params, "info2", legacyMessage);
  elements.info3.textContent = readText(params, "info3", "Info Block 3");
  elements.footer.textContent = readText(params, "footer", "Footer");

  timeOverride = params.has("time") ? params.get("time").trim() : null;
  updateTime();

  const hasBrand = iconUrl.length > 0;
  elements.info3.hidden = hasBrand;
  elements.brand.hidden = !hasBrand;

  if (hasBrand) {
    elements.brandImage.src = iconUrl;
  } else {
    elements.brandImage.removeAttribute("src");
  }
}

renderFromHash();
window.addEventListener("hashchange", renderFromHash);
window.setInterval(updateTime, 30_000);
