# Draw.io Graffoo Importer

A [diagrams.net](https://app.diagrams.net/) (draw.io) plugin that imports OWL ontologies (TTL/RDF) and visualises them using the **Graffoo** graphical notation.

## Features
Imports OWL ontology definitions with Graffoo visualization directly into diagrams.net (draw.io). It supports the conversion of:
- `owl:Class`
   - Subclass
   - Equivalence
- `owl:NamedIndividual`
- `owl:AnnotationProperty`
- `owl:DataProperty`
- `owl:ObjectProperty`
- the prefix table.

After the initial import, users have full control to manually customise the diagram layout.
Multiple domains/ranges for properties are not supported, only the first one is created.

## How to Use
1. **Download:** Get the `graffoo_plugin.js` from the `dist/` folder (or build it yourself).
2. **Install:**
   - Open the **draw.io Desktop app** (run with `drawio --enable-plugins`) or a **self-hosted Docker instance** (external plugins are not supported on the online version).
   - Go to **Extras** > **Plugins**.
   - Click **Add** -> **Custom** -> **Select File**.
   - Choose `graffoo_plugin.js`.
3. **Run:**
   - Restart the application or refresh the page.
   - Go to **Extras** > **Import OWL (Graffoo Style)**.
   - Select your `.ttl` file.

## Development

Prerequisite: [Bun](https://bun.sh/) installed.

```bash
# 1. Install dependencies:
bun install

# 2. Build the plugin:
bun run build
```

The output file will be at `dist/graffoo_plugin.js`.