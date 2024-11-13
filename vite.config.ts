import { defineConfig } from "vite";
import monkey, { MonkeyUserScript } from "vite-plugin-monkey";
import metadata from "./metadata.json";
import pkg from "./package.json";

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      server: { mountGmApi: true },
      userscript: {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        author: pkg.author,
        match: "*://*/*",
        ...metadata as MonkeyUserScript,
      },
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
});
