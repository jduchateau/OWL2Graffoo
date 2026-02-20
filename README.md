# OWL2Graffoo: A Draw.io plugin Graffoo Importer

A [diagrams.net](https://app.diagrams.net/) (formerly draw.io) plugin that imports OWL ontologies (TTL/RDF) and visualises them using the [Graffoo graphical notation](https://essepuntato.it/graffoo/) and some UML-like extensions we propose for compactness.

An online version can be found at: <https://owl2graffoo-49bbf6.gitlabpages.uliege.be>

## Features

Imports OWL ontology definitions with Graffoo visualisation directly into diagrams.net (draw.io).

It supports the conversion of:
- `owl:Class`
   - Subclass
   - Equivalence
   - Position data preserved with `draw:x`, `draw:y`, `draw:width`, `draw:height` during import/export.
   - Draw as UML-like class with its data properties when the class is annotated with `draw:uml true`.
- `owl:NamedIndividual` 🧪 not tested
- `owl:AnnotationProperty`
- `owl:DataProperty`
- `owl:ObjectProperty`
- the prefix table.



After the initial import, users have full control to manually customise the diagram layout.
Multiple domains/ranges for properties are not supported, only the first one is created.

You can re-export the diagram position data as RDF. 
Before importing it again, merge it with your main ontology, to also restore the layout.

```turtle
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix draw: <http://drawio.org#> .
```

## How to Use

Go to <https://owl2graffoo-49bbf6.gitlabpages.uliege.be> or follow these steps to install the plugin locally:

1. **Download:** Get the `graffoo_plugin.js` from the `dist/` folder (or build it yourself).
2. **Install:**
   - Open the **draw.io Desktop app** (run with `drawio --enable-plugins`) or a **self-hosted Docker instance** (external plugins are not supported on the online version).
   - Go to **Extras** > **Plugins**.
   - Click **Add** -> **Custom** -> **Select File**.
   - Choose `graffoo_plugin.js`.
3. **Run:**
   - Restart the application or refresh the page.
   - **Import:** Go to **Extras** > **Import OWL (Graffoo Style)** and select your `.ttl` file.
   - **Export:** Go to **Extras** > **Export OWL with Positions** to save the diagram with position information.

### Position Export/Import Workflow

1. **Import an ontology:** Use **Extras> Import OWL (Graffoo Style)** to load your ontology
2. **Arrange the diagram:** Manually position the objects as desired
3. **Export with positions:** Use **Extras> Export OWL with Positions** to save a `.ttl` file with position data
4. **Re-import:** Next time you import the same ontology (with position data), objects will be placed at their saved positions

The position data is stored as RDF triples using these properties:
- `draw:x` - X coordinate
- `draw:y` - Y coordinate
- `draw:width` - Width of the object
- `draw:height` - Height of the object

## Development

Prerequisite: [Bun](https://bun.sh/) installed.
To rebuild drawio, `java` and `ant` are also required.

```bash
# Install dependencies:
bun install

# Build the plugin:
bun run build

# Start drawio locally:
bun run start
```

The output file will be at `dist/graffoo_plugin.js`.

## Legend

![Legend](./Graffoo-compact-legend.svg)

## License

This project is licensed under the Apache 2.0 license, (see [LICENSE](LICENSE)).

The submodule `drawio` is licensed under the Apache 2.0 license, (see [drawio/LICENSE](drawio/LICENSE)).

The submodule `styles` is licensed under the Apache 2.0 license, (see [styles/LICENSE](styles/LICENSE)).
