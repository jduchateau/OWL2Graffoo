import rdf from '@rdfjs/data-model';
import { Writer } from 'n3';
import {xsd as XSD} from 'rdf-namespaces';
import {drawio} from './vocab.ts';

/** @typedef {import('./graphTypes.js').mxGraph} mxGraph */

/**
 * Export graph to TTL format with position information
 * @param {mxGraph} graph
 * @returns {Promise<string>} TTL content
 */
export function exportLayoutToRDF(graph) {
    const model = graph.getModel();
    const parent = graph.getDefaultParent();
    const writer = new Writer({ prefixes: {
            draw: 'https://w3id.org/dre/drawio#',
            xsd: 'http://www.w3.org/2001/XMLSchema#'
        }});

    const quads = [];

    // Iterate through all cells
    const cells = graph.getVerticesAndEdges();
    for (const cell of cells) {

        // Only process cells that have links (IRIs)
        const link = graph.getLinkForCell(cell);
        if (!link) continue;
        console.log('Exporting layout for:', link, cell);

        const subject = rdf.namedNode(link);

        // Export vertices with position information
        if (model.isVertex(cell) && !model.isEdge(cell)) {
            const geo = model.getGeometry(cell);
            if (geo) {
                // Add x coordinate
                quads.push(rdf.quad(
                    subject,
                    rdf.namedNode(drawio.x),
                    rdf.literal(geo.x.toString(), rdf.namedNode(XSD.double))
                ));

                // Add y coordinate
                quads.push(rdf.quad(
                    subject,
                    rdf.namedNode(drawio.y),
                    rdf.literal(geo.y.toString(), rdf.namedNode(XSD.double))
                ));

                // Add width and height
                quads.push(rdf.quad(
                    subject,
                    rdf.namedNode(drawio.width),
                    rdf.literal(geo.width.toString(), rdf.namedNode(XSD.double))
                ));

                quads.push(rdf.quad(
                    subject,
                    rdf.namedNode(drawio.height),
                    rdf.literal(geo.height.toString(), rdf.namedNode(XSD.double))
                ));
            }
        }
    }

    // Add quads to writer
    writer.addQuads(quads);

    return new Promise((resolve, reject) => {
        writer.end((error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}
