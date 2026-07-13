import { defineConfig } from "vite";
import { CONTENT_SECURITY_POLICY } from "./src/security.js";

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "production-security-policy",
      apply: "build",
      transformIndexHtml: {
        order: "pre",
        handler() {
          return [
            {
              tag: "meta",
              attrs: {
                "http-equiv": "Content-Security-Policy",
                content: CONTENT_SECURITY_POLICY,
              },
              injectTo: "head-prepend",
            },
          ];
        },
      },
    },
  ],
});
