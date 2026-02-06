import {Parser, Store} from 'n3';
import {owl as OWL, rdf as RDF, rdfs as RDFS, xsd as XSD} from 'rdf-namespaces';
import rdf from '@rdfjs/data-model';
import PrefixMap from '@rdfjs/prefix-map';
import {GRAFFOO_STYLES} from './styles_output.js';
import {drawio} from './vocab.js';
import {MY_GRAFFOO_STYLES} from "./my_style.js";

/**
 * @typedef {import('./graphTypes.js').mxGraph} mxGraph
 * @typedef {import('./graphTypes.js').mxCell} mxCell
 *
 * @typedef {import('@rdfjs/types').NamedNode} NamedNode
 */

/**
 *
 * @param {string} rdfContent
 * @param {mxGraph} graph
 */
export function processFile(rdfContent, graph) {
    console.log('Graffoo Plugin: Processing started with content length:', rdfContent.length);
    const parser = new Parser();
    const store = new Store();
    /** @type {PrefixMap} */
    const prefixes = new PrefixMap([], {factory: rdf});

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
            drawOntology(graph, store, prefixes);
        }
    });
}


/**
 * Draw the ontology in the graph
 * @param {mxGraph} graph
 * @param {Store} store
 * @param {Record<string, NamedNode>} prefixMap
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
            return iri.substring(ontologyIri.length);
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
    let hasPositionInfo = false;
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

            // Check if position information exists in the store
            const iriNode = rdf.namedNode(iri);
            const xQuads = store.getQuads(iriNode, drawio.x, null, null);
            const yQuads = store.getQuads(iriNode, drawio.y, null, null);

            let x = 0, y = 0;
            if (xQuads.length > 0 && yQuads.length > 0) {
                try {
                    x = parseFloat(xQuads[0].object.value);
                    y = parseFloat(yQuads[0].object.value);
                    hasPositionInfo = true;
                    console.log(`Graffoo Plugin: Using stored position for ${iri}: (${x}, ${y})`);
                } catch (e) {
                    console.warn(`Graffoo Plugin: Failed to parse position for ${iri}:`, e);
                }
            }

            const cell = graph.insertVertex(parent, null, label, x, y, w, h, style);
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
                    return {property: prop, range: range};
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
                for (const {property, range} of dataPropertiesWithRanges) {
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
            } else {
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

        // Only apply automatic layout if no position information is found
        if (!hasPositionInfo) {
            console.log('Graffoo Plugin: No position information found, applying automatic layout');
            const layout = new mxFastOrganicLayout(graph);
            layout.forceConstant = 150;
            layout.execute(graph.getDefaultParent());
        } else {
            console.log('Graffoo Plugin: Position information found, skipping automatic layout');
        }
    }
}