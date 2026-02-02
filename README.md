# Draw.io Graffoo Importer

A [diagrams.net](https://app.diagrams.net/) (draw.io) plugin that imports OWL ontologies (TTL/RDF) and visualises them using the **Graffoo** graphical notation.

## Features
- **One-click Import:** Adds an "Import OWL" option to the Extras menu.
- **Graffoo Styling:** Automatically styles Classes (Yellow), Individuals (Pink), and Datatypes (Green) according to Graffoo specs.
- **Auto Layout:** Automatically arranges nodes to prevent overlap.
- **Zero Config:** Runs entirely in the browser.

## How to Use
1. **Download:** Get the `graffoo_plugin.js` from the `dist/` folder (or build it yourself).
2. **Install:**
   - Open [draw.io](https://app.diagrams.net/).
   - Go to **Extras** > **Plugins**.
   - Click **Add** -> **Custom** -> **Select File**.
   - Choose `graffoo_plugin.js`.
3. **Run:**
   - Refresh the page (if prompted).
   - Go to **Extras** > **Import OWL (Graffoo Style)**.
   - Select your `.owl` or `.ttl` file.

## How it Works
1. **Bundling:** The plugin uses `N3.js` bundled via **Bun** to parse RDF files client-side.
2. **Mapping:** It iterates through the RDF triples:
   - `owl:Class` → Yellow Rectangle
   - `owl:NamedIndividual` → Pink Ellipse
   - Object Properties → Solid Arrows
3. **Rendering:** It uses the internal `mxGraph` API (exposed by draw.io) to insert vertices and edges directly into the canvas.

## Development

Prerequisite: [Bun](https://bun.sh/) installed.

```bash
# 1. Install dependencies:
bun install

# 2. Build the plugin:
bun run build
```

The output file will be at `dist/graffoo_plugin.js`.