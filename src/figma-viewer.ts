import { LitElement, css, html, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./canvas";
import "./components/inspector-content";
import "./components/spinner";
import * as figma from "./figma";
import type { FigmaNode, FigmaViewerOptions } from "./types";
const FIGMA_API_BASE_URL = "https://api.figma.com";

@customElement("figma-viewer")
export class FigmaViewer extends LitElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  static styles = css`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 8rem;
    }
    .canvas-container {
      width: 100%;
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

  private timer: any;

  async connectedCallback(): Promise<void> {
    super.connectedCallback();
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    if (this.url) {
      this.initializeFigmaData();
    }
    window.onresize = () => {
      if (this.timer) {
        clearTimeout(this.timer);
      }
      const elm = this.shadowRoot?.querySelector("div.canvas-container");
      if (elm) {
        this.scaleFactor =
          this.rootNode?.absoluteBoundingBox.width / elm.clientWidth;
      }
    };
  }

  protected async updated(_changedProperties: PropertyValues) {
    const elm = this.shadowRoot?.querySelector("div.canvas-container");
    if (elm) {
      this.scaleFactor =
        this.rootNode?.absoluteBoundingBox.width / elm.clientWidth;
    }
  }

  render() {
    const dimensions = this.getRootNodeDimensions();
    if (!dimensions || !this.scaleFactor) {
      return html`<div class="canvas-container">
        <div class="loading-container">
          <spinner-element></spinner-element>
        </div>
      </div>`;
    }
    return html`
      <div class="canvas-container">
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

  private async initializeFigmaData(): Promise<void> {
    const { fileKey, nodeId } = this.parseUrl();
    if (!fileKey || !nodeId) {
      console.error("Invalid Figma URL: missing fileKey or nodeId");
      return;
    }

    try {
      // Load image and spec in parallel
      const [imageUrl, rootNode] = await Promise.all([
        this.getFigmaImage(fileKey, nodeId),
        this.getFigmaSpec(fileKey, nodeId),
      ]);

      this.figmaImageUrl = imageUrl;

      if (!figma.hasBoundingBox(rootNode)) {
        console.error("Root node does not have bounding box");
        return;
      }

      this.rootNode = rootNode;
      this.allNodes = this.collectVisibleNodes(rootNode);
    } catch (error) {
      console.error("Failed to load Figma data:", error);
    }
  }

  private parseUrl(): { fileKey: string | null; nodeId: string | null } {
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

  private collectVisibleNodes(rootNode: FigmaNode): FigmaNode[] {
    const nodes: FigmaNode[] = [];
    for (const node of figma.walk(rootNode)) {
      if (node.visible !== false && figma.hasBoundingBox(node)) {
        nodes.push(node as FigmaNode);
      }
    }
    return nodes;
  }

  private getRootNodeDimensions(): { width: number; height: number } | null {
    if (!this.rootNode?.absoluteBoundingBox) {
      return null;
    }
    return {
      width: this.rootNode.absoluteBoundingBox.width,
      height: this.rootNode.absoluteBoundingBox.height,
    };
  }

  private async getFigmaSpec(
    fileKey: string,
    nodeId: string
  ): Promise<figma.Node> {
    const response = await fetch(
      `${FIGMA_API_BASE_URL}/v1/files/${fileKey}/nodes?ids=${nodeId}`,
      {
        headers: {
          "X-Figma-Token": this.accessToken,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Figma spec: ${response.statusText}`);
    }

    const data = await response.json();
    return data.nodes[nodeId].document as figma.Node;
  }

  private async getFigmaImage(
    fileKey: string,
    nodeId: string
  ): Promise<string> {
    const response = await fetch(
      `${FIGMA_API_BASE_URL}/v1/images/${fileKey}?ids=${nodeId}&format=svg`,
      {
        headers: {
          "X-Figma-Token": this.accessToken,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Figma image: ${response.statusText}`);
    }

    const data = await response.json();
    return data.images[nodeId];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "figma-viewer": FigmaViewer;
  }
}
