# Simple RoomOS Web Widget

A lightweight, front-end-only web widget intended for Cisco RoomOS devices and GitHub Pages.

## Local development

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The default content is a centered **Hello world** message.

## Hash parameters

Widget data is supplied through URL hash parameters so it remains entirely in the browser. The first supported parameter is `message`:

```text
http://localhost:5173/#message=Hello%20RoomOS
```

## Production build

```sh
npm run build
```

The static output is written to `dist/` and can be hosted with GitHub Pages.

Pushes to `main` run the included GitHub Pages deployment workflow. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** once.

## License

This project is licensed under the [Cisco Sample Code License, Version 1.1](LICENSE).
