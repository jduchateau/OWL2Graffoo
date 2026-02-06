/** @typedef {import('./graphTypes.js').mxGraph} mxGraph */

import GraffooStyles from "./styles.json";
import {exportLayoutToRDF} from "./exportLayoutToRDF.js";
import {processFile} from "./importOntology.js";

Draw.loadPlugin(function (app) {
    /**
     * Decodes a Draw.io XML template into mxGraph cells and model.
     *
     * @param {string} xmlStr - XML string containing a serialized mxGraph model.
     * @returns {{ cells: Array<mxCell>, model: mxGraphModel }} The decoded cells from the first layer and the model.
     */
    function decodeTemplateCells(xmlStr) {
        const xmlDoc = mxUtils.parseXml(xmlStr);
        const codec = new mxCodec(xmlDoc);
        const model = new mxGraphModel();
        codec.decode(xmlDoc.documentElement, model);

        const root = model.getRoot();
        const parent = root.getChildAt(0);
        const cells = [];

        for (let i = 0; i < parent.getChildCount(); i++) {
            cells.push(parent.getChildAt(i));
        }

        return {cells, model};
    }

    // --- Load Sidebar Graffoo Palette ---

    try {
        app.sidebar.addPalette('graffoo', 'Graffoo', true, function (content) {
            for (let graffooShape of GraffooStyles) {
                const {cells} = decodeTemplateCells(graffooShape.xml);

                // Create a vertex template from the cells for the palette
                content.appendChild(
                    app.sidebar.createVertexTemplateFromCells(
                        cells,
                        graffooShape.w,
                        graffooShape.h,
                        graffooShape.title
                    )
                );
            }
        });
    } catch (e) {
        console.error("Graffoo Plugin: Failed to load Graffoo palette using individual templates:", e);
    }

    // --- UI Integration ---
    const menu = app.menus.get('extras');
    const oldFunct = menu.funct;

    menu.funct = function (menu, parent) {
        oldFunct.apply(this, arguments);
        app.menus.addMenuItems(menu, ['-', 'importGraffoo', 'exportGraffoo'], parent);
    };

    mxResources.parse('importGraffoo=Import OWL (Graffoo Style)...');
    mxResources.parse('exportGraffoo=Export OWL with Positions...');

    app.actions.addAction('importGraffoo', function () {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', '.ttl,.owl,.rdf,.nt');

        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    processFile(e.target.result, app.editor.graph);
                } catch (err) {
                    console.error(err);
                    mxUtils.alert('Error: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });

    app.actions.addAction('exportGraffoo', async function () {
        try {
            const graph = app.editor.graph;
            const ttlContent = await exportLayoutToRDF(graph);

            // Download the file
            const blob = new Blob([ttlContent], {type: 'text/turtle'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ontology_with_positions.ttl';
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            mxUtils.alert('Error exporting: ' + err.message);
        }
    });
});