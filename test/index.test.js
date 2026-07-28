import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
const settingsUi = await readFile(
  new URL("../src/settings-ui.js", import.meta.url),
  "utf8",
);
const styles = await readFile(
  new URL("../src/style.css", import.meta.url),
  "utf8",
);

test("guides an unconfigured user to the gear and README", () => {
  assert.match(
    html,
    /href="https:\/\/github\.com\/ctg-tme\/Simple-WebWidget#user-guide"/,
  );
  assert.match(html, /src="\.\/configure-widget\.png"/);
  assert.match(html, /Use the gear in the top-right to configure this WebWidget/);
  assert.match(html, /Scan to learn more about the Simple WebWidget/);
  assert.match(html, /id="configuration-error" hidden/);
});

test("provides an accessible non-modal settings drawer for every supported content type", () => {
  const settingsDrawer = html.slice(
    html.indexOf('<div id="settings-modal"'),
    html.indexOf("<dialog", html.indexOf('<div id="settings-modal"')),
  );

  assert.match(html, /class="mds-theme-stable-lightWebex"/);
  assert.match(html, /id="settings-button"[\s\S]*aria-expanded="false"/);
  assert.match(html, /id="settings-button"[\s\S]*<svg/);
  assert.match(html, /id="settings-modal" class="settings-drawer"/);
  assert.match(html, /<aside[\s\S]*aria-labelledby="settings-title"/);
  assert.doesNotMatch(settingsDrawer, /aria-modal="true"|<dialog/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /Not included/);
  assert.match(html, /Website \/ iframe/);
  assert.match(html, /H2R countdown/);
  assert.match(html, /https:\/\/h2r\.graphics\/tools\/countdown\//);
  assert.match(html, /id="setting-24hr-time"[\s\S]*name="24hrTime"/);
  assert.match(html, /Use 24-hour time/);
  assert.match(html, /id="setting-hide-settings"/);
});

test("keeps visible weather coordinates and offers all location methods in one modal", () => {
  const settingsFormStart = html.indexOf('<form id="settings-form"');
  const settingsFormEnd = html.indexOf("</form>", settingsFormStart);
  const locationDialogStart = html.indexOf(
    '<dialog\n      id="location-search-dialog"',
  );
  const weatherSettingsStart = html.indexOf('<div id="weather-settings"');
  const weatherSettings = html.slice(
    weatherSettingsStart,
    html.indexOf("</fieldset>", weatherSettingsStart),
  );
  const locationDialog = html.slice(
    locationDialogStart,
    html.indexOf('<template id="information-setting-template">'),
  );

  assert.match(
    weatherSettings,
    /id="search-for-location"[\s\S]*Search for a location/,
  );
  assert.doesNotMatch(weatherSettings, /id="use-device-location"/);
  assert.match(
    locationDialog,
    /id="use-device-location"[\s\S]*Use this device’s location/,
  );
  assert.ok(
    locationDialog.indexOf('id="use-device-location"') <
      locationDialog.indexOf('id="location-search-form"'),
  );
  assert.match(html, /id="setting-latitude"[\s\S]*id="setting-longitude"/);
  assert.ok(locationDialogStart > settingsFormEnd);
  assert.match(
    html,
    /<dialog[\s\S]*id="location-search-dialog"[\s\S]*aria-modal="true"[\s\S]*aria-labelledby="location-search-title"/,
  );
  assert.match(
    html,
    /Search by city, town, village, or postal\/ZIP code\. Exact street addresses are not supported\./,
  );
  assert.match(html, /id="location-search-status"[\s\S]*role="status"/);
  assert.match(
    html,
    /id="location-search-results"[\s\S]*aria-label="Location search results"/,
  );
  assert.match(html, /id="maps-url-input"/);
  assert.match(
    html,
    /Shortened maps\.app\.goo\.gl links are not supported\./,
  );
  assert.match(html, /Open-Meteo[\s\S]*GeoNames/);
  assert.match(settingsUi, /elements\.locationDialog\.showModal\(\)/);
  assert.match(settingsUi, /addEventListener\("cancel"/);
  assert.match(
    settingsUi,
    /elements\.locationDialog\.addEventListener\("keydown"[\s\S]*event\.stopPropagation\(\)/,
  );
  assert.match(settingsUi, /function applyCoordinates\(/);
  assert.match(settingsUi, /function setDeviceLocationLoading\(/);
  assert.match(
    settingsUi,
    /function useDeviceLocation\(\)[\s\S]*requestVersion !== locationUiRequestVersion[\s\S]*closeLocationDialog\(\)/,
  );
  assert.match(
    settingsUi,
    /locationUiRequestVersion \+= 1;[\s\S]*locationSearchClient\.cancel\(\)/,
  );
});

test("previews drawer changes without changing the URL until Apply", () => {
  assert.match(main, /onPreview: renderConfiguration/);
  assert.match(main, /onCancel: renderFromHash/);
  assert.match(styles, /body\.settings-open \.widget-shell/);
  assert.match(styles, /\.settings-drawer--open/);
});

test("captures xLaunch once and removes it without reloading", () => {
  assert.match(main, /trackPageOpened\(initialFragment\)/);
  assert.match(main, /stripLaunchContextFromFragment\(initialFragment\)/);
  assert.match(main, /window\.history\.replaceState/);
  assert.doesNotMatch(main, /location\.reload/);
});

test("includes a motion-aware winter overlay without adding a theme option", () => {
  assert.match(html, /id="winter-effects"[\s\S]*winter-snowman/);
  assert.match(styles, /--winter-light-cell: clamp\(/);
  assert.match(styles, /--winter-content-inset: clamp\(/);
  assert.match(styles, /html\.winter-active \.widget-shell/);
  assert.match(styles, /@keyframes winter-snowfall-right/);
  assert.match(styles, /@keyframes winter-snowman-crossing/);
  assert.doesNotMatch(html, /<option[^>]*>Winter<\/option>/);
});

test("keeps settings static and transitions RoomOS themes in place after one second", () => {
  assert.match(main, /const THEME_TRANSITION_DELAY_MS = 1_000/);
  assert.match(main, /classList\.add\("theme-transitioning"\)/);
  assert.match(styles, /@keyframes roomos-theme-crossfade/);
  assert.match(styles, /--settings-surface:[\s\S]*--mds-color-theme/);
  assert.match(styles, /\.settings-button \{[\s\S]*?border: 0;/);
  assert.match(styles, /\.settings-panel \{[\s\S]*?border: 0;/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(main, /window\.location\.hash = fragment/);
  assert.doesNotMatch(main, /location\.reload/);
});

test("uses the Evening Fjord palette for Auto in every device appearance", () => {
  assert.doesNotMatch(styles, /:root\[data-theme="Auto"\]/);
});

test("places borderless branding inline with the heading and keeps info3 independent", () => {
  const header = html.slice(
    html.indexOf('<header id="header"'),
    html.indexOf("</header>") + "</header>".length,
  );

  assert.match(header, /id="brand"[\s\S]*id="brand-image"[\s\S]*id="heading"/);
  assert.match(styles, /\.brand img \{[\s\S]*?filter:[\s\S]*?drop-shadow\(/);
  assert.match(html, /<section id="info-3" class="info-block" hidden><\/section>/);
  assert.doesNotMatch(html, /brandable-block|info-block--brandable/);
});

test("does not remove rendered frames with a fixed load timeout", () => {
  assert.match(main, /getInformationFrameSandbox/);
  assert.doesNotMatch(
    main,
    /FRAME_LOAD_TIMEOUT|information-frame-load-timeout/,
  );
});

test("keeps text and iframe information blocks on equal outer flex geometry", () => {
  const infoBlockRule =
    styles.match(/\.info-block \{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.match(infoBlockRule, /padding: 0;/);
  assert.match(styles, /\.info-block__text \{[\s\S]*?padding: 18px 24px;/);
  assert.match(main, /className = "info-block__text"/);
});
