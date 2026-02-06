/**
 * Minimal graph interface used by the Graffoo plugin.
 * Keep this small and focused on methods we actually call.
 *
 * @typedef {Object} mxCell
 * @typedef {Object} mxGraphModel
 *
 * @typedef {Object} mxGraph
 * @property {(parent: mxCell, id: (string|null), value: any, x: number, y: number, width: number, height: number, style?: string) => mxCell} insertVertex
 * @property {(parent: mxCell, id: (string|null), value: any, source: (mxCell|null), target: (mxCell|null), style?: string) => mxCell} insertEdge
 * @property {() => mxCell} getDefaultParent
 * @property {() => mxGraphModel} getModel
 * @property {(cell: mxCell, link: string) => void} setLinkForCell
 * @property {(cell: mxCell) => (string|null)} getLinkForCell
 * @property {(cell: mxCell, recurse?: boolean) => void} autoSizeCell
 */

export {};