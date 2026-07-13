# Simple RoomOS Web Widget

A lightweight, front-end-only web widget intended for Cisco RoomOS devices and GitHub Pages.

## Local development

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The widget is a fixed 600 × 600 CSS pixels at normal RoomOS display sizes, so it keeps the same scale on 1080p and 4K screens. With no configured content it displays **Widget is not configured** above the permanent footer.

## Hash parameters

Widget data is supplied exclusively through URL hash parameters (everything after `#`) so it remains entirely in the browser. URL query parameters are ignored.

| Parameter | Content |
| --- | --- |
| `theme` | RoomOS theme name; defaults to `EveningFjord` |
| `heading` | Information heading |
| `weather` | Set to `true` to show the Momentum Design weather icon |
| `temp` | Local temperature |
| `time` | Set to `true` to show a 24-hour clock |
| `timeZone` | Optional IANA timezone, such as `America/New_York`; otherwise the browser timezone is used |
| `info1` | First information block |
| `info2` | Second information block |
| `info3` | Third information block |
| `iconUrl` | Square branding image URL; when present, `info3` is hidden |

Example:

```text
http://localhost:5173/#heading=Welcome&weather=true&temp=72%C2%B0&time=true&timeZone=America%2FNew_York&info1=Meeting%20room%20available&info2=Hello%20RoomOS&info3=Third%20message
```

The original `message` parameter remains supported as an alias for `info2`.

### RoomOS themes

The `theme` hash parameter accepts the endpoint values exactly as written:

`ArcticNight`, `Auto`, `CarbonBlack`, `ChiliPlum`, `CrystalMist`, `EveningFjord`, `FirstLight`, `FoggyMoor`, `Light`, `MeadowStone`, `Night`, `PebbleShoal`, `PoppyBreeze`, `SandShoal`, and `SmokedRose`.

Missing or unrecognized values use `EveningFjord`. `Light` uses the `FirstLight` palette, `Night` uses the `CarbonBlack` palette, and `Auto` follows the browser's light or dark color-scheme preference.

Information blocks support line breaks in any of these forms:

- URL-encoded newline: `%0A`
- Literal escaped newline: `\n`
- HTML-style break text: `<br>` or `<br/>`

The text remains escaped; other HTML is never rendered. Encode the full value of `iconUrl`, especially when the image URL contains its own `?` or `&` characters.

The widget always includes a fixed footer: `© {YEAR} Cisco Systems, Inc. || Created by the Collaboration TME team`. The year is generated in the browser and is not configurable.

## Production build

```sh
npm run build
```

The static output is written to `dist/` and can be hosted with GitHub Pages.

Pushes to `main` run the included GitHub Pages deployment workflow. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** once.

## License

This project is licensed under the [Cisco Sample Code License, Version 1.1](LICENSE).
