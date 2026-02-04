import { Parser, Quad, Store } from 'n3';
import { rdf as RDF, owl as OWL, rdfs as RDFS, xsd as XSD } from 'rdf-namespaces';
import rdf from '@rdfjs/data-model';
import PrefixMap from '@rdfjs/prefix-map';
import { GRAFFOO_STYLES } from './styles_output.js';
import { GRAFFOO_STYLE_XML } from './styles_xml_output.js';

Draw.loadPlugin(function (app) {

    const MY_GRAFFOO_STYLES = {
        // dotted arrow
        SubClassOf: 'endArrow=block;html=1;textDirection=ltr;dashed=1;dashPattern=1 1',
        // link with double line
        EquivalentClass: 'endArrow=none;html=1;textDirection=ltr;shape=link',
    }

    // --- UI Integration ---
    const menu = app.menus.get('extras');
    const oldFunct = menu.funct;

    menu.funct = function (menu, parent) {
        oldFunct.apply(this, arguments);
        app.menus.addMenuItems(menu, ['-', 'importGraffoo'], parent);
    };

    mxResources.parse('importGraffoo=Import OWL (Graffoo Style)...');

    app.actions.addAction('importGraffoo', function () {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', '.ttl,.owl,.rdf,.nt');

        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    processFile(e.target.result);
                } catch (err) {
                    console.error(err);
                    mxUtils.alert('Error: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });

    // --- Main Logic ---

    /**
     * 
     * @param {string} rdfContent 
     */
    function processFile(rdfContent) {
        console.log('Graffoo Plugin: Processing started with content length:', rdfContent.length);
        const parser = new Parser();
        const store = new Store();
        /** @type {PrefixMap} */
        const prefixes = new PrefixMap([], { factory: rdf });

        parser.parse(rdfContent, (error, quad, parsedPrefixes) => {
            if (error) {
                console.error(error);
                mxUtils.alert('Error parsing ontology: ' + error.message);
                return;
            }
            if (parsedPrefixes) {
                console.log('Graffoo Plugin: Parsed prefixes:', parsedPrefixes);
                // parsedPrefixes is an object mapping prefix -> uri
                Object.entries(parsedPrefixes).forEach(([p, u]) => {
                    try {
                        prefixes.set(p, rdf.namedNode(u));
                    } catch (e) {
                        console.warn('Graffoo Plugin: Failed to set prefix', p, u, e);
                    }
                });
            }
            if (quad) {
                store.addQuad(quad);
            } else {
                // Parsing complete
                console.log('Graffoo Plugin: Parsing complete. Store size:', store.size);
                const graph = app.editor.graph;
                drawOntology(graph, store, prefixes);
            }
        });
    }



    /**
     * Draw the ontology in the graph
     * @param {mxGraph} graph
     * @param {Store} store 
     * @param {Record<string, RDF.NamedNode>} prefixes 
     */
    function drawOntology(graph, store, prefixes) {

        // Find the ontology
        const ontologyQuads = store.getQuads(null, RDF.type, OWL.Ontology, null);
        if (ontologyQuads.length !== 1) {
            console.warn('Graffoo Plugin: Expected exactly one ontology declaration, found:', ontologyQuads.length);
        } else {
            console.log('Graffoo Plugin: Found ontology declaration:', ontologyQuads[0].subject.value);
        }

        const ontologyIri = ontologyQuads.length > 0 ? ontologyQuads[0].subject.value : null;


        /** Get label for IRI using prefixes.
         * Label is not rdfs:label but prefixed name or for the current ontology just the local name
         * @param {string} iri 
         * @returns {string}
         */
        function getLabel(iri) {
            if (!iri) return "";
            // For the ontology IRI return only the local name
            if (ontologyIri && iri.startsWith(ontologyIri)) {
                const localPart = iri.substring(ontologyIri.length);
                return localPart;
            }

            try {
                const shrunk = prefixes.shrink(rdf.namedNode(iri));
                if (shrunk && shrunk.value) return shrunk.value;
            } catch (e) {
                // ignore and fallback
            }

            return iri;
        }

        graph.getModel().beginUpdate();
        try {
            const parent = graph.getDefaultParent();
            /** @type {Record<string, mxCell>} */
            const cells = {};

            function drawPrefixesFromTemplate() {
                const prefixesTemplate = GRAFFOO_STYLE_XML.Prefixes;
                const doc = mxUtils.parseXml(prefixesTemplate);
                const dec = new mxCodec(doc);
                const prefixContainer = dec.decode(doc.documentElement.firstChild, graph.getModel());
                prefixContainer.geometry.x = 20;
                prefixContainer.geometry.y = 20;
                graph.addCell(prefixContainer, parent);

                for (const [prefix, uriNode] of prefixes.entries()) {
                    const label = `${prefix}: ${uriNode.value}`;
                    const rowTemplate = GRAFFOO_STYLE_XML.PrefixRow;
                    const rowDoc = mxUtils.parseXml(rowTemplate);
                    const rowDec = new mxCodec(rowDoc);
                    const prefixRow = rowDec.decode(rowDoc.documentElement.firstChild, graph.getModel());
                    prefixRow.value = label;
                    graph.addCell(prefixRow, prefixContainer);
                }

            }
            function drawPrefixes() {
                if (!prefixes || prefixes.size === 0) return;

                let x = 20, y = 20;
                const width = 200;

                // Container
                const prefixContainer = graph.insertVertex(parent, null, 'Prefixes', x, y, width, 0, GRAFFOO_STYLES.Prefixes);

                for (const [prefix, uriNode] of prefixes.entries()) {
                    const label = `${prefix}: ${uriNode.value}`;
                    graph.insertVertex(prefixContainer, null, label, 0, 0, width, 26, GRAFFOO_STYLES.PrefixRow);
                }
            }
            try {
                drawPrefixesFromTemplate();
            } catch (error) {
                console.warn("Graffoo Plugin: Failed to draw prefixes from template, falling back to styled drawing.", error);
                try {
                    drawPrefixes();
                } catch (error) {
                    console.error("Graffoo Plugin: Failed to draw prefixes from style.", error);
                }
            }

            /**
             * Draw Entity as Node
             * @param {string} iri 
             * @param {string} style 
             * @param {number} w 
             * @param {number} h 
             * @returns {mxCell}
             */
            function drawEntity(iri, style, w, h) {
                const label = getLabel(iri);
                const cell = graph.insertVertex(parent, null, label, 0, 0, w, h, style);
                graph.setLinkForCell(cell, iri);
                return cell;
            }

            // Classes
            const classQuads = store.getQuads(null, RDF.type, OWL.Class, null);
            console.log('Graffoo Plugin: Found classes:', classQuads.length);
            classQuads.forEach(q => {
                const iri = q.subject.value;
                if (!cells[iri]) {
                    cells[iri] = drawEntity(iri, GRAFFOO_STYLES.Class, 120, 50);
                }
            });

            // Individuals
            const individualsQuads = store.getQuads(null, RDF.type, OWL.NamedIndividual, null);
            console.log("Graffoo Plugin: Found individuals:", individualsQuads.length);
            individualsQuads.forEach(q => {
                const iri = q.subject.value;
                if (!cells[iri]) {
                    cells[iri] = drawEntity(iri, GRAFFOO_STYLES.Individual, 80, 80);
                }
            });


            /**
             * Draw Entities represented as Arrows
             * @param {string} iri 
             * @param {mxCell} sourceCell 
             * @param {mxCell} targetCell 
             * @param {string} targetIri 
             * @param {string} style 
             */
            function drawArrowEntity(iri, sourceCell, targetCell, targetIri, style) {
                // Handle implicit entities (outside this ontology file)
                // They will be redrawn every time.
                if (!targetCell && targetIri) {
                    targetCell = drawEntity(targetIri, GRAFFOO_STYLES.Datatype, 100, 30);
                }

                // By default dangling edges are allowed
                const edge = graph.insertEdge(parent, null, getLabel(iri), sourceCell, targetCell, style);
                graph.setLinkForCell(edge, iri);

            }

            /**
             * Fetch first domain and range and draw arrow entity
             * @param {Quad} quad 
             * @param {string} style 
             */
            function fetchAndDrawArrowEntity(quad, style) {
                const entityIri = quad.subject.value;
                const domainQuads = store.getQuads(quad.subject, RDFS.domain, null, null);
                const domainIri = domainQuads.length > 0 ? domainQuads[0].object.value : null;
                const rangeQuads = store.getQuads(quad.subject, RDFS.range, null, null);
                const rangeIri = rangeQuads.length > 0 ? rangeQuads[0].object.value : null;

                const sourceCell = domainIri ? cells[domainIri] : null;
                const targetCell = rangeIri ? cells[rangeIri] : null;
                drawArrowEntity(entityIri, sourceCell, targetCell, rangeIri, style);
            }

            /**
             * 
             * @param {string} propertyType 
             * @param {string} style 
             */
            function processArrowEntities(propertyType, style) {
                const propQuads = store.getQuads(null, RDF.type, propertyType);
                console.log(`Graffoo Plugin: Found properties of type ${propertyType}:`, propQuads.length);
                propQuads.forEach(q => fetchAndDrawArrowEntity(q, style));
            }
            processArrowEntities(OWL.ObjectProperty, GRAFFOO_STYLES.objectProperty);
            processArrowEntities(OWL.DatatypeProperty, GRAFFOO_STYLES.dataProperty);
            processArrowEntities(OWL.AnnotationProperty, GRAFFOO_STYLES.annotationProperty);

            /** Draw relations between entities (subClassOf, equivalentClass)
             * @param {string} iri 
             * @param {mxCell} sourceCell 
             * @param {mxCell} targetCell 
             * @param {string} style
             */
            function drawEntityRelations(iri, sourceCell, targetCell, style, withLabel) {
                if (sourceCell && targetCell) {
                    const edge = graph.insertEdge(parent, null, '', sourceCell, targetCell, style);
                    graph.setLinkForCell(edge, iri);
                }
                else {
                    console.warn("Graffoo Plugin: Cannot draw relation for IRI:", iri,
                        "Source or Target cell missing.", sourceCell, targetCell);
                }
            }
            function processEntityRelations(relationType, style) {
                const relationQuads = store.getQuads(null, relationType, null, null);
                console.log(`Graffoo Plugin: Found relations of type ${relationType}:`, relationQuads.length);
                relationQuads.forEach(q => {
                    const subjectIri = q.subject.value;
                    const objectIri = q.object.value;
                    const subjectCell = cells[subjectIri];
                    const objectCell = cells[objectIri];
                    drawEntityRelations(relationType, subjectCell, objectCell, style);
                });
            }

            processEntityRelations(RDFS.subClassOf, MY_GRAFFOO_STYLES.SubClassOf);
            processEntityRelations(OWL.equivalentClass, MY_GRAFFOO_STYLES.EquivalentClass);

        } finally {
            graph.getModel().endUpdate();
            // Layout
            const layout = new mxFastOrganicLayout(graph);
            layout.forceConstant = 150;
            layout.execute(graph.getDefaultParent());
        }
    }






});