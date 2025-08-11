import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";
import "./figma-viewer";
import "./index.css";
import "./react-figma-viewer";

import type { FigmaViewerOptions } from "./types";

@customElement("demo-element")
export class FigmaViewer extends LitElement {
  static styles?: CSSResultGroup | undefined = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `;
  controller: any;
  selectedNodeId: string;
  protected render() {
    const options: FigmaViewerOptions = {
      enablePanAndZoom: true,
    };
    const figmaAccessToken = import.meta.env.VITE_FIGMA_ACCESS_TOKEN;
    return html` <button @click=${this.exportImage}>export image</button>
      <button @click=${this.exportSvg}>export svg</button>
      <button @click=${this.hightlightNode}>Highlight Node</button>
      <figma-viewer
        .accessToken=${figmaAccessToken}
        url="https://www.figma.com/design/TFXcgvmT6q9KEY4vWYg8XE/Sample-Project---Localhost--Copy-?node-id=1-69&t=o3XinfXHTmzpysq8-4"
        .options=${options}
        @node-selected=${this.onNodeSelected}
        @loaded=${this.onLoaded}
      ></figma-viewer>`;
  }

  private async exportImage() {
    const output = await this.controller.exportImage(this.selectedNodeId);
    console.log(output);
  }

  private async exportSvg() {
    const output = await this.controller.exportSvg(this.selectedNodeId);
    console.log(output);
  }

  private async hightlightNode() {
    this.controller.highlightNode("1:160");
  }

  private onNodeSelected(e: CustomEvent) {
    this.selectedNodeId = e.detail.id;
  }

  private onLoaded(e: CustomEvent) {
    this.controller = e.detail.controller;
  }
}
