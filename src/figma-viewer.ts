import { LitElement, css, html, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./canvas";
import "./components/inspector-content";
import "./components/spinner";
import * as figma from "./figma";
import { FigmaRest } from "./figma-rest";
import type { FigmaNode, FigmaViewerOptions } from "./types";
const FIGMA_API_BASE_URL = "https://api.figma.com";

@customElement("figma-viewer")
export class FigmaViewer extends LitElement {
  #figmaRest: FigmaRest;
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 8rem;
    }
    .figma-viewer {
      width: 100%;
      height: 100%;
    }
  `;

  @property() accessToken = "";
  @property() url = "";
  @property()
  options: FigmaViewerOptions;

  @state() private rootNode: FigmaNode;
  @state() private allNodes: FigmaNode[] = [];
  @state() private figmaImageUrl = "";
  @state() private scaleFactor = 0;

  #timer: any;

  async connectedCallback(): Promise<void> {
    super.connectedCallback();
    this.#figmaRest = new FigmaRest(FIGMA_API_BASE_URL, {
      accessToken: this.accessToken,
    });
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    if (this.url) {
      this.#initializeFigmaData();
    }
    window.onresize = () => {
      if (this.#timer) {
        clearTimeout(this.#timer);
      }
      const elm = this.shadowRoot?.querySelector("div.figma-viewer");
      if (elm) {
        this.scaleFactor =
          this.rootNode?.absoluteBoundingBox.width / elm.clientWidth;
      }
    };
  }

  protected async updated(_changedProperties: PropertyValues) {
    const elm = this.shadowRoot?.querySelector("div.figma-viewer");
    if (elm) {
      this.scaleFactor =
        this.rootNode?.absoluteBoundingBox.width / elm.clientWidth;
    }
  }

  render() {
    const dimensions = this.#getRootNodeDimensions();
    if (!dimensions || !this.scaleFactor) {
      return html`<div class="figma-viewer">
        <div class="loading-container">
          <spinner-element></spinner-element>
        </div>
      </div>`;
    }
    return html`
      <div class="figma-viewer">
        <canvas-element
          .scaleFactor=${this.scaleFactor}
          .dimensions=${dimensions}
          .nodes=${this.allNodes}
          .figmaImageUrl=${this.figmaImageUrl}
          .rootNode=${this.rootNode}
          .options=${this.options}
        ></canvas-element>
      </div>
    `;
  }

  async #initializeFigmaData(): Promise<void> {
    const { fileKey, nodeId } = this.#parseUrl();
    if (!fileKey || !nodeId) {
      console.error("Invalid Figma URL: missing fileKey or nodeId");
      return;
    }

    try {
      // Load image and spec in parallel
      const [imageUrl, rootNode] = await Promise.all([
        this.#figmaRest.getFigmaImage(fileKey, nodeId),
        this.#figmaRest.getFigmaSpec(fileKey, nodeId),
      ]);

      this.figmaImageUrl = imageUrl;

      if (!figma.hasBoundingBox(rootNode)) {
        console.error("Root node does not have bounding box");
        return;
      }

      this.rootNode = rootNode;
      this.allNodes = this.#collectVisibleNodes(rootNode);
    } catch (error) {
      console.error("Failed to load Figma data:", error);
    }
  }

  #parseUrl(): { fileKey: string | null; nodeId: string | null } {
    try {
      const url = new URL(this.url);
      const fileKey = url.pathname.split("/")[2];
      const nodeId = url.searchParams.get("node-id")?.replace("-", ":") || null;
      return { fileKey, nodeId };
    } catch (error) {
      console.error("Failed to parse URL:", error);
      return { fileKey: null, nodeId: null };
    }
  }

  #collectVisibleNodes(rootNode: FigmaNode): FigmaNode[] {
    const nodes: FigmaNode[] = [];
    for (const node of figma.walk(rootNode)) {
      if (node.visible !== false && figma.hasBoundingBox(node)) {
        nodes.push(node as FigmaNode);
      }
    }
    return nodes;
  }

  #getRootNodeDimensions(): { width: number; height: number } | null {
    if (!this.rootNode?.absoluteBoundingBox) {
      return null;
    }
    return {
      width: this.rootNode.absoluteBoundingBox.width,
      height: this.rootNode.absoluteBoundingBox.height,
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "figma-viewer": FigmaViewer;
  }
}
