# Simple RoomOS Web Widget

A lightweight, front-end-only information widget for Cisco RoomOS devices, hosted with GitHub Pages and configured entirely through URL hash parameters.

The widget uses a fixed 600 × 600 CSS-pixel canvas at normal RoomOS display sizes, keeping the same scale on 1080p and 4K screens. With no configured content, it displays a QR code linking back to this guide above the permanent footer.

## User Guide

Add configuration after the `#` in the GitHub Pages URL. Only the sections represented by supplied parameters are shown.

![Numbered map showing where each URL parameter appears in the RoomOS WebWidget](docs/images/user-guide/widget-parameter-map.png)

| Label | Parameters | Effect |
| ---: | --- | --- |
| 1 | `heading` | Top information heading |
| 2 | `weather`, `weatherSymbol`, `temp`, `latitude`, `longitude`, `temperatureUnit`, `time`, `timeZone` | Compact local weather and time area |
| 3 | `info1` | First information block |
| 4 | `info2` or `message` | Second information block |
| 5 | `info3` | Third information block; hidden when `iconUrl` is supplied |

<table>
  <tr>
    <td align="center"><img src="docs/images/user-guide/configured-widget.png" width="320" alt="Configured WebWidget with generic text and branding"><br><sub><code>iconUrl</code> replaces <code>info3</code></sub></td>
    <td align="center"><img src="docs/images/user-guide/unconfigured-widget.png" width="320" alt="Unconfigured WebWidget showing the setup QR code"><br><sub>No hash parameters: setup QR code</sub></td>
  </tr>
</table>

The `theme` parameter controls the entire background, glass surfaces, borders, and text palette. The footer remains visible in every permutation.

The footer is not editable with hash parameters.

### Ready-to-use examples

Each example is a complete URL and can be opened directly or pasted into a RoomOS Web Widget configuration.

#### Three information blocks

[Open the three-block example](https://ctg-tme.github.io/Simple-WebWidget/#theme=EveningFjord&heading=Visitor%20Information&weather=true&weatherSymbol=%E2%9B%85&temp=72%C2%B0F&time=true&timeZone=America%2FNew_York&info1=Welcome%20to%20the%20collaboration%20space&info2=Next%20session%20starts%20at%203%3A30%20PM&info3=Please%20leave%20the%20room%20ready%20for%20the%20next%20group)

```text
https://ctg-tme.github.io/Simple-WebWidget/#theme=EveningFjord&heading=Visitor%20Information&weather=true&weatherSymbol=%E2%9B%85&temp=72%C2%B0F&time=true&timeZone=America%2FNew_York&info1=Welcome%20to%20the%20collaboration%20space&info2=Next%20session%20starts%20at%203%3A30%20PM&info3=Please%20leave%20the%20room%20ready%20for%20the%20next%20group
```

#### Branding image instead of `info3`

[Open the branding example](https://ctg-tme.github.io/Simple-WebWidget/#theme=ChiliPlum&heading=Visitor%20Information&weather=true&weatherSymbol=%E2%9B%85&temp=72%C2%B0F&time=true&timeZone=America%2FNew_York&info1=Welcome%20to%20the%20collaboration%20space&iconUrl=https%3A%2F%2Fgithub.com%2FWebexSamples.png%3Fsize%3D256)

```text
https://ctg-tme.github.io/Simple-WebWidget/#theme=ChiliPlum&heading=Visitor%20Information&weather=true&weatherSymbol=%E2%9B%85&temp=72%C2%B0F&time=true&timeZone=America%2FNew_York&info1=Welcome%20to%20the%20collaboration%20space&iconUrl=https%3A%2F%2Fgithub.com%2FWebexSamples.png%3Fsize%3D256
```

#### Live weather from coordinates

[Open the live-weather example](https://ctg-tme.github.io/Simple-WebWidget/#theme=ArcticNight&heading=Local%20Conditions&weather=true&latitude=40.7128&longitude=-74.0060&temperatureUnit=fahrenheit&time=true&timeZone=America%2FNew_York&info1=Live%20weather%20for%20the%20configured%20location)

```text
https://ctg-tme.github.io/Simple-WebWidget/#theme=ArcticNight&heading=Local%20Conditions&weather=true&latitude=40.7128&longitude=-74.0060&temperatureUnit=fahrenheit&time=true&timeZone=America%2FNew_York&info1=Live%20weather%20for%20the%20configured%20location
```

#### Unconfigured widget

[Open the unconfigured widget](https://ctg-tme.github.io/Simple-WebWidget/)

```text
https://ctg-tme.github.io/Simple-WebWidget/
```

## Hash parameters

Widget configuration is supplied exclusively through URL hash parameters—everything after `#`. URL query parameters are ignored. Fragments are not included in HTTP requests to the hosting server, but they may remain visible in browser or device history, bookmarks, screenshots, logs captured by client software, and management interfaces. Never place passwords, tokens, personal data, or other secrets in widget fragments.

| Parameter | Content |
| --- | --- |
| `theme` | RoomOS 26 theme name; defaults to `EveningFjord` |
| `heading` | Information heading |
| `weather` | Set to `true` to show weather |
| `weatherSymbol` | Optional weather symbol shown without live coordinates and used as a fallback if live weather cannot be retrieved |
| `latitude` | Latitude used to retrieve current weather; requires `weather=true` |
| `longitude` | Longitude used to retrieve current weather; requires `weather=true` |
| `temperatureUnit` | `fahrenheit` (default) or `celsius` |
| `temp` | Optional temperature shown without live coordinates or while live weather loads |
| `time` | Set to `true` to show a 24-hour clock |
| `timeZone` | Optional IANA timezone, such as `America/New_York`; otherwise the browser or device timezone is used |
| `info1` | First information block |
| `info2` | Second information block |
| `info3` | Third information block |
| `message` | Backward-compatible alias for `info2` |
| `iconUrl` | Validated square branding image URL; when present, `info3` is hidden |

When coordinates are configured, the widget retrieves current temperature, weather condition, and day/night state directly from Open-Meteo. It refreshes every 15 minutes and converts the current WMO weather code into a recognizable clear, cloudy, fog, rain, snow, or thunderstorm symbol. The weather symbol links to the data provider for attribution. This live feature requires outbound HTTPS access to `api.open-meteo.com` from the RoomOS device.

### Input limits and invalid configuration

The widget validates the complete fragment before displaying supplied content or requesting a branding image. These limits are intentionally sized for the 600 × 600 layout:

| Input | Maximum characters |
| --- | ---: |
| Complete fragment, before decoding and excluding `#` | 8,192 |
| `heading` | 80 |
| `temp` | 16 |
| `weatherSymbol` | 16 |
| `timeZone` | 64 |
| Each of `info1`, `info2`, `info3`, and `message` | 400 |
| `iconUrl` | 2,048 |
| `theme` | 32 |
| Each coordinate | 24 |
| `temperatureUnit` | 16 |
| Boolean fields | 5 |

Malformed percent encoding, incomplete or invalid coordinates, an excessive fragment, an oversized field, or an unsafe branding URL causes the complete configuration to be rejected. Existing branding image sources are removed and the widget displays **Widget configuration is invalid**. Values are never truncated silently.

### Branding image policy

Branding images may use any cross-origin HTTPS URL, a same-origin HTTPS URL, or a relative URL hosted with the widget. During local development, same-origin HTTP images are also allowed from `localhost` or the private LAN address serving the widget.

URLs with credentials, unsupported schemes such as `javascript:`, `file:`, or `data:`, malformed URLs, and loopback or private literal targets are rejected. Private or loopback same-origin HTTP is allowed only in local development. Validation deliberately does not attempt DNS-based private-network detection, so administrators should use trusted image hosts where possible. Branding image requests use a `no-referrer` policy.

### Line breaks

Information blocks support line breaks in any of these forms:

- URL-encoded newline: `%0A`
- Literal escaped newline: `\n`
- HTML-style break text: `<br>` or `<br/>`

The text remains escaped; other HTML is never rendered. Encode the full value of `iconUrl`, especially when the image URL contains its own `?` or `&` characters.

### Console diagnostics

Invalid configuration, invalid time-zone fallback, weather retrieval failure, and branding image load failure are reported in the browser console with a `[Simple-WebWidget]` prefix and a stable issue code. Configuration values and the complete fragment are not logged. For example, a rejected scheme reports `icon-url-unsupported-scheme`, while a failed image request reports `branding-image-load-failed`.

## RoomOS 26 Themes

The `theme` parameter accepts the endpoint values exactly as written. Every image below is a compact screenshot captured from the running WebWidget with generic content.

<table>
  <tr>
    <td align="center"><img src="docs/images/themes/arctic-night.png" width="180" alt="Arctic Night WebWidget theme screenshot"><br><code>ArcticNight</code></td>
    <td align="center"><img src="docs/images/themes/auto.png" width="180" alt="Auto WebWidget theme screenshot"><br><code>Auto</code><br><sub>Follows device appearance</sub></td>
    <td align="center"><img src="docs/images/themes/carbon-black.png" width="180" alt="Carbon Black WebWidget theme screenshot"><br><code>CarbonBlack</code></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/images/themes/chili-plum.png" width="180" alt="Chili Plum WebWidget theme screenshot"><br><code>ChiliPlum</code></td>
    <td align="center"><img src="docs/images/themes/crystal-mist.png" width="180" alt="Crystal Mist WebWidget theme screenshot"><br><code>CrystalMist</code></td>
    <td align="center"><img src="docs/images/themes/evening-fjord.png" width="180" alt="Evening Fjord WebWidget theme screenshot"><br><code>EveningFjord</code><br><sub>Default</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/images/themes/first-light.png" width="180" alt="First Light WebWidget theme screenshot"><br><code>FirstLight</code></td>
    <td align="center"><img src="docs/images/themes/foggy-moor.png" width="180" alt="Foggy Moor WebWidget theme screenshot"><br><code>FoggyMoor</code></td>
    <td align="center"><img src="docs/images/themes/light.png" width="180" alt="Light WebWidget theme screenshot"><br><code>Light</code></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/images/themes/meadow-stone.png" width="180" alt="Meadow Stone WebWidget theme screenshot"><br><code>MeadowStone</code></td>
    <td align="center"><img src="docs/images/themes/night.png" width="180" alt="Night WebWidget theme screenshot"><br><code>Night</code></td>
    <td align="center"><img src="docs/images/themes/pebble-shoal.png" width="180" alt="Pebble Shoal WebWidget theme screenshot"><br><code>PebbleShoal</code></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/images/themes/poppy-breeze.png" width="180" alt="Poppy Breeze WebWidget theme screenshot"><br><code>PoppyBreeze</code></td>
    <td align="center"><img src="docs/images/themes/sand-shoal.png" width="180" alt="Sand Shoal WebWidget theme screenshot"><br><code>SandShoal</code></td>
    <td align="center"><img src="docs/images/themes/smoked-rose.png" width="180" alt="Smoked Rose WebWidget theme screenshot"><br><code>SmokedRose</code></td>
  </tr>
</table>

Missing or unrecognized values use `EveningFjord`. `Light` uses the `FirstLight` palette, `Night` uses the `CarbonBlack` palette, and `Auto` follows the browser or device light/dark appearance.

Each palette covers the complete page body, including the space around and between content sections. Content sections use translucent glass backgrounds with blur and a leaf-derived outline color selected to complement the corresponding RoomOS wallpaper while preserving readable contrast.

## Local development

Install [Git](https://git-scm.com/) and [Node.js 22](https://nodejs.org/) first, then clone and start the project:

```sh
git clone https://github.com/ctg-tme/Simple-WebWidget.git
cd Simple-WebWidget
npm ci
npm run dev
```

Open the local URL printed by Vite. The development server listens on all network interfaces so RoomOS devices on the same LAN can reach it. Run the development server only on a trusted network or protect access with suitable host firewall controls.

## Production build

```sh
npm ci
npm test
npm run build
npm run check:production-security
```

The static output is written to `dist/`. Production builds include a restrictive Content Security Policy and an explicit `no-referrer` policy. The CSP permits same-origin scripts, styles, and fonts; same-origin, data, and HTTPS images; and the Open-Meteo weather API as the only outbound connection. Development builds omit the CSP meta tag so Vite hot-module replacement continues to work.

Pushes to `main` run the included GitHub Pages deployment workflow. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. Deploying directly from the `main` branch serves the unbuilt Vite source and will not render the widget correctly.

After a successful workflow run, the widget is available at [https://ctg-tme.github.io/Simple-WebWidget/](https://ctg-tme.github.io/Simple-WebWidget/).

## License

This project is licensed under the [Cisco Sample Code License, Version 1.1](LICENSE).
