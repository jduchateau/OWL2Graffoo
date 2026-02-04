import { build } from "bun";

await build({
  entrypoints: ["./src/index.js"],
  outdir: "./dist",
  target: "browser",
  format: "iife",
  minify: false,
  sourcemap: "none", // Draw.io doesn't use sourcemaps
  naming: "graffoo_plugin.js",
});

console.log("✅ Build complete: dist/graffoo_plugin.js");