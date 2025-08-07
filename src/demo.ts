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
  nodeSelected: any;
  protected render() {
    const options: FigmaViewerOptions = {
      enablePanAndZoom: true,
    };
    const figmaAccessToken = import.meta.env.VITE_FIGMA_ACCESS_TOKEN;
    return html` <button @click=${this.exportImage}>Export image</button>
      <figma-viewer
        .accessToken=${figmaAccessToken}
        url="https://www.figma.com/design/TFXcgvmT6q9KEY4vWYg8XE/Sample-Project---Localhost--Copy-?node-id=1-545&t=o3XinfXHTmzpysq8-4"
        .options=${options}
        @node-selected=${this.onNodeSelected}
        @loaded=${this.onLoaded}
      ></figma-viewer>`;
  }

  private async exportImage() {
    const b64 = await this.controller.exportImage(this.nodeSelected);
    console.log(b64);
  }

  private onNodeSelected(e: CustomEvent) {
    this.nodeSelected = e.detail;
  }

  private onLoaded(e: CustomEvent) {
    this.controller = e.detail.controller;
  }
}
