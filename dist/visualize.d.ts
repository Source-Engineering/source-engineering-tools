/**
 * Visualizer: render a COTS as a Mermaid diagram and a self-contained HTML page.
 *
 * The Mermaid diagram shows the COTS's flow: Sources -> Claims -> Decision.
 * The HTML page wraps the Mermaid diagram in a self-contained viewer.
 */
import type { Cots } from "./cots.js";
export declare const toMermaid: (cots: Cots) => string;
export declare const toHtml: (cots: Cots, cotsId?: string) => string;
