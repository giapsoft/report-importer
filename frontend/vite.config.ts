import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const buildVersion = process.env.VITE_BUILD_VERSION || "dev";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "inject-build-version",
      transformIndexHtml(html) {
        return html.replace(
          "</head>",
          `    <meta name="build-version" content="${buildVersion}" />\n  </head>`,
        );
      },
    },
  ],
  base: process.env.VITE_BASE || "/",
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
