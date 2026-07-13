import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const outputDirectory = new URL("../public/", import.meta.url);
const outputFile = new URL("configure-widget.png", outputDirectory);

await mkdir(outputDirectory, { recursive: true });
await QRCode.toFile(
  fileURLToPath(outputFile),
  "https://github.com/ctg-tme/Simple-WebWidget#user-guide",
  {
    errorCorrectionLevel: "H",
    margin: 3,
    width: 320,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  },
);

console.log("Generated public/configure-widget.png");
