import { Parser, Store } from 'n3';
import { rdf as RDF, owl as OWL, rdfs as RDFS, xsd as XSD } from 'rdf-namespaces';
import rdf from '@rdfjs/data-model';
import PrefixMap from '@rdfjs/prefix-map';
import { GRAFFOO_STYLES } from './styles_output.js';
import { drawio } from './vocab.js';
import GraffooStyles from "./styles.json";

/**
 * @typedef {import('n3').Term} Term
 * @typedef {import('n3').Quad_Subject} QuadSubject
 */



/**
 * Function: insertVertex
 * 
 * Adds a new vertex into the given parent <mxCell> using value as the user
 * object and the given coordinates as the <mxGeometry> of the new vertex.
 * The id and style are used for the respective properties of the new
 * <mxCell>, which is returned.
 *
 * When adding new vertices from a mouse event, one should take into
 * account the offset of the graph container and the scale and translation
 * of the view in order to find the correct unscaled, untranslated
 * coordinates using <mxGraph.getPointForEvent> as follows:
 * 
 * (code)
 * var pt = graph.getPointForEvent(evt);
 * var parent = graph.getDefaultParent();
 * graph.insertVertex(parent, null,
 * 			'Hello, World!', x, y, 220, 30);
 * (end)
 * 
 * For adding image cells, the style parameter can be assigned as
 * 
 * (code)
 * stylename;image=imageUrl
 * (end)
 * 
 * See <mxGraph> for more information on using images.
 *
 * Parameters:
 * 
 * parent - <mxCell> that specifies the parent of the new vertex.
 * id - Optional string that defines the Id of the new vertex.
 * value - Object to be used as the user object.
 * x - Integer that defines the x coordinate of the vertex.
 * y - Integer that defines the y coordinate of the vertex.
 * width - Integer that defines the width of the vertex.
 * height - Integer that defines the height of the vertex.
 * style - Optional string that defines the cell style.
 * relative - Optional boolean that specifies if the geometry is relative.
 * Default is false.
 */

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

        return { cells, model };
    }

    // --- Load Sidebar Graffoo Palette ---

    try {
        app.sidebar.addPalette('graffoo', 'Graffoo', true, function (content) {
            for (let graffooShape of GraffooStyles) {
                const { cells } = decodeTemplateCells(graffooShape.xml);

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



    const MY_GRAFFOO_STYLES = {
        // dotted arrow
        SubClassOf: 'endArrow=block;html=1;textDirection=ltr;dashed=1;dashPattern=1 1',
        // link with double line
        EquivalentClass: 'endArrow=none;html=1;textDirection=ltr;shape=link',
        ClassUML: GRAFFOO_STYLES.Class + ';html=1;shape=swimlane;startSize=20;',
        ClassAttributeUML: 'text;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;portConstraint=eastwest;whiteSpace=wrap;html=1;',

        PrefixHeader: 'graphMlID=n0;shape=swimlane;startSize=20;fillColor=#b7b69e;strokeColor=#000000;strokeWidth=1.0;align=right;spacingRight=10;fontStyle=1',
        PrefixColumnPrefix: 'text;html=1;align=center;verticalAlign=middle;autosize=1;fontFamily=Courier New;',
        PrefixColumnUrl: 'text;html=1;align=left;verticalAlign=middle;autosize=1;fontFamily=Courier New;',
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
     * @param {Record<string, RDF.NamedNode>} prefixMap 
     */
    function drawOntology(graph, store, prefixMap) {

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
                const shrunk = prefixMap.shrink(rdf.namedNode(iri));
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

            function drawPrefixes() {
                if (!prefixMap || prefixMap.size === 0) return;

                console.log("Graffoo Plugin: Rendering prefixes:", prefixMap.size);

                // Container
                const prefixContainer = graph.insertVertex(
                    parent, null,
                    'Prefixes',
                    20, 20,
                    356, 81,
                    MY_GRAFFOO_STYLES.PrefixHeader
                );

                let prefixes = "";
                let uris = "";

                prefixMap.entries().forEach(([prefix, uriNode]) => {
                    prefixes += prefix + '\n';
                    uris += uriNode.value + '\n';
                });

                // Prefix column
                const prefixColumn = graph.insertVertex(prefixContainer, null,
                    prefixes.trim(),
                    0, 31,
                    50, 0,
                    MY_GRAFFOO_STYLES.PrefixColumnPrefix);
                // URI column
                const uriColumn = graph.insertVertex(prefixContainer, null,
                    uris.trim(),
                    80, 31,
                    280, 0,
                    MY_GRAFFOO_STYLES.PrefixColumnUrl);

                graph.autoSizeCell(prefixColumn, false);
                graph.autoSizeCell(uriColumn, false);
                graph.autoSizeCell(prefixContainer, false);
            }
            drawPrefixes(prefixMap);


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
            const classes = store.getQuads(null, RDF.type, OWL.Class, null).map(quad => quad.subject);
            console.log('Graffoo Plugin: Found classes:', classes.length);
            /**
             * Helper to detect boolean true-ish literals
             * @param {Term} lit
             */
            function isTrueLiteral(lit) {
                if (!lit) return false;
                if (lit.termType === 'Literal') {
                    const v = lit.value.toLowerCase();
                    if (v === 'true' || v === '1') return true;
                    if (lit.datatype && lit.datatype.value === XSD.boolean) return lit.value === 'true' || lit.value === '1';
                }
                return false;
            }
            function isUml(classSubject) {
                const umlQuads = store.getQuads(classSubject, drawio.uml, null, null);
                return umlQuads.length > 0 && isTrueLiteral(umlQuads[0].object);
            }

            /** @type {Set<string>} */
            const dataProperties = new Set(store.getQuads(null, RDF.type, OWL.DatatypeProperty, null).map(quad => quad.subject.value));
            console.log("Graffoo Plugin: Found data properties:", dataProperties);
            /** @type {Set<string>} */
            const umlDataProperties = new Set();

            classes.forEach(classSubject => {
                const iri = classSubject.value;
                if (cells[iri]) return;
                const renderUml = isUml(classSubject);
                if (!renderUml) {
                    console.log("Graffoo Plugin: Rendering Graffoo class:", iri);
                    cells[iri] = drawEntity(iri, GRAFFOO_STYLES.Class, 120, 50);
                } else {
                    console.info("Graffoo Plugin: Rendering UML class for:", iri);

                    // collect attributes (data properties) of that class
                    const classProperties = store.getQuads(null, RDFS.domain, classSubject, null).map(quad => quad.subject.value);
                    const classDataProperties = classProperties.filter(propIri => dataProperties.has(propIri));

                    // add to the set to avoid drawing them as arrows later
                    classDataProperties.forEach(propIri => umlDataProperties.add(propIri));

                    // collect ranges
                    const dataPropertiesWithRanges = classDataProperties.map(propIri => {
                        const prop = rdf.namedNode(propIri);
                        const rangeQuads = store.getQuads(prop, RDFS.range, null, null);
                        const range = rangeQuads.length > 0 ? rangeQuads[0].object : null;
                        return { property: prop, range: range };
                    });

                    console.log("Graffoo Plugin: Drawing UML class for:", iri, "with data properties:", dataPropertiesWithRanges);

                    // Draw class with UML style
                    const height = Math.max(60, 20 + dataPropertiesWithRanges.length * 20);
                    const classCell = graph.insertVertex(
                        parent, null,
                        getLabel(iri),
                        0, 0,
                        180, height,
                        MY_GRAFFOO_STYLES.ClassUML);
                    graph.setLinkForCell(classCell, iri);
                    cells[iri] = classCell;
                    console.log("Graffoo Plugin: Drew UML class:", iri, "with attributes:", dataPropertiesWithRanges.length);

                    // Draw data properties as UML class attributes
                    let yOffset = 20;
                    for (const { property, range } of dataPropertiesWithRanges) {
                        const label = range
                            ? `${getLabel(property.value)}: ${getLabel(range.value)}`
                            : getLabel(property.value);

                        const attributeCell = graph.insertVertex(
                            classCell, null,
                            label,
                            0, yOffset,
                            180, 20,
                            MY_GRAFFOO_STYLES.ClassAttributeUML);
                        graph.setLinkForCell(attributeCell, property.value);
                        yOffset += 20;
                    }
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
             * @param {QuadSubject} entitySubject 
             * @param {string} style 
             */
            function fetchAndDrawArrowEntity(entitySubject, style) {
                const entityIri = entitySubject.value;
                const domainQuads = store.getQuads(entitySubject, RDFS.domain, null, null);
                const domainIri = domainQuads.length > 0 ? domainQuads[0].object.value : null;
                const rangeQuads = store.getQuads(entitySubject, RDFS.range, null, null);
                const rangeIri = rangeQuads.length > 0 ? rangeQuads[0].object.value : null;

                const sourceCell = domainIri ? cells[domainIri] : null;
                const targetCell = rangeIri ? cells[rangeIri] : null;
                drawArrowEntity(entityIri, sourceCell, targetCell, rangeIri, style);
            }

            /**
             * 
             * @param {string} propertyType 
             * @param {string} style 
             * @param {Set<string>} exceptions
             */
            function processArrowEntities(propertyType, style, exceptions = null) {
                let props = store.getQuads(null, RDF.type, propertyType).map(quad => quad.subject);
                console.log(`Graffoo Plugin: Found properties of type ${propertyType}:`, props.length);
                if (exceptions) {
                    props = props.filter(q => !exceptions.has(q.value));
                }
                props.forEach(p => fetchAndDrawArrowEntity(p, style));
            }
            processArrowEntities(OWL.ObjectProperty, GRAFFOO_STYLES.objectProperty);
            processArrowEntities(OWL.DatatypeProperty, GRAFFOO_STYLES.dataProperty, dataProperties, umlDataProperties);
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