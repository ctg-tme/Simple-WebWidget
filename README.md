# Simple RoomOS Web Widget

A lightweight, front-end-only web widget intended for Cisco RoomOS devices and GitHub Pages.

## Local development

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The widget is a fixed 600 × 600 CSS pixels at normal RoomOS display sizes, so it keeps the same scale on 1080p and 4K screens.

## Hash parameters

Widget data is supplied through URL hash parameters so it remains entirely in the browser.

| Parameter | Content |
| --- | --- |
| `heading` | Information heading |
| `weather` | Compact weather symbol, such as `☀️` |
| `temp` | Local temperature |
| `time` | Optional time override; otherwise the browser's local time is used |
| `info1` | First information block |
| `info2` | Second information block |
| `info3` | Third information block |
| `footer` | Footer text |
| `iconUrl` | Square branding image URL; when present, `info3` is hidden |

Example:

```text
http://localhost:5173/#heading=Welcome&weather=%E2%98%80%EF%B8%8F&temp=72%C2%B0&info1=Meeting%20room%20available&info2=Hello%20RoomOS&info3=Third%20message&footer=Have%20a%20great%20day
```

The original `message` parameter remains supported as an alias for `info2`.

## Production build

```sh
npm run build
```

The static output is written to `dist/` and can be hosted with GitHub Pages.

Pushes to `main` run the included GitHub Pages deployment workflow. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** once.

## License

This project is licensed under the [Cisco Sample Code License, Version 1.1](LICENSE).
