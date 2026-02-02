import { Parser, Store } from 'n3';

Draw.loadPlugin(function (ui) {

    // --- Configuration: Graffoo Look & Feel ---
    // Styles matched from the standard Graffoo palette
    const GRAFFOO_STYLES = {
        'Class': 'shape=rect;rounded=1;whiteSpace=wrap;html=1;fillColor=yellow;strokeColor=#000000;fontColor=#000000;fontStyle=1;fontFamily=Helvetica;',
        'Datatype': 'shape=rect;rounded=0;whiteSpace=wrap;html=1;fillColor=#CCFFCC;strokeColor=#000000;dashed=1;',
        'Individual': 'shape=ellipse;whiteSpace=wrap;html=1;fillColor=#FFCCCC;strokeColor=#000000;',
        'ObjectProperty': 'endArrow=classic;html=1;strokeColor=#000000;rounded=1;curved=1;',
        'DataProperty': 'endArrow=classic;html=1;strokeColor=#000000;dashed=1;rounded=1;curved=1;'
    };

    // --- UI Integration ---
    const menu = ui.menus.get('extras');
    const oldFunct = menu.funct;

    menu.funct = function (menu, parent) {
        oldFunct.apply(this, arguments);
        ui.menus.addMenuItems(menu, ['-', 'importGraffoo'], parent);
    };

    mxResources.parse('importGraffoo=Import OWL (Graffoo Style)...');

    ui.actions.addAction('importGraffoo', function () {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', '.ttl,.owl,.rdf,.nt');

        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => processOntology(e.target.result);
            reader.readAsText(file);
        };
        input.click();
    });

    // --- Core Logic ---
    function processOntology(rdfContent) {
        const graph = ui.editor.graph;
        const parser = new Parser();
        const store = new Store();
        const cells = {}; // IRI -> mxCell mapping

        // 1. Parse RDF
        parser.parse(rdfContent, (error, quad, prefixes) => {
            if (error) {
                console.error(error);
                mxUtils.alert('Error parsing ontology: ' + error.message);
                return;
            }
            if (quad) {
                store.addQuad(quad);
            } else {
                // 2. Draw on Completion
                drawGraph(graph, store, cells);
            }
        });
    }

    function drawGraph(graph, store, cells) {
        graph.getModel().beginUpdate();
        try {
            const parent = graph.getDefaultParent();

            // Draw Classes
            store.getQuads(null, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://www.w3.org/2002/07/owl#Class').forEach(q => {
                const iri = q.subject.value;
                if (!cells[iri]) {
                    cells[iri] = graph.insertVertex(parent, null, getLabel(iri), 0, 0, 120, 50, GRAFFOO_STYLES.Class);
                }
            });

            // Draw Individuals
            store.getQuads(null, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://www.w3.org/2002/07/owl#NamedIndividual').forEach(q => {
                const iri = q.subject.value;
                if (!cells[iri]) {
                    cells[iri] = graph.insertVertex(parent, null, getLabel(iri), 0, 0, 60, 60, GRAFFOO_STYLES.Individual);
                }
            });

            // Draw Relations
            store.forEach(q => {
                const s = q.subject.value;
                const p = q.predicate.value;
                const o = q.object.value;

                // Skip non-visual triples (definitions)
                if (p === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') return;

                if (cells[s] && cells[o]) {
                    graph.insertEdge(parent, null, getLabel(p), cells[s], cells[o], GRAFFOO_STYLES.ObjectProperty);
                }
            });

        } finally {
            graph.getModel().endUpdate();

            // Auto Layout
            const layout = new mxFastOrganicLayout(graph);
            layout.forceConstant = 150;
            layout.execute(graph.getDefaultParent());
        }
    }

    function getLabel(iri) {
        if (!iri) return "";
        if (iri.indexOf('#') > -1) return iri.split('#')[1];
        const parts = iri.split('/');
        return parts[parts.length - 1];
    }
});