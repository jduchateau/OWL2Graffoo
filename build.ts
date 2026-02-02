import { build } from "bun";

await build({
  entrypoints: ["./src/index.js"],
  outdir: "./dist",
  target: "browser",
  minify: true, // Minify for production
  sourcemap: "none", // Draw.io doesn't need sourcemaps usually
  naming: "graffoo_plugin.js", // Output filename
});

console.log("✅ Build complete: dist/graffoo_plugin.js");