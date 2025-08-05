import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement } from "lit/decorators.js";
import "./figma-viewer";
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
  private zoomController: any;
  protected render() {
    const options: FigmaViewerOptions = {
      enablePanAndZoom: true,
    };
    const figmaAccessToken = import.meta.env.VITE_FIGMA_ACCESS_TOKEN;
    return html` <button @click=${this.resetZoom}>Reset zoom</button>
      <figma-viewer
        .accessToken=${figmaAccessToken}
        url="https://www.figma.com/design/TFXcgvmT6q9KEY4vWYg8XE/Sample-Project---Localhost--Copy-?node-id=1-921&t=HcjhREwC0gLkcAhl-4"
        .options=${options}
        @node-selected=${this.onNodeSelected}
        @init=${this.onInit}
      ></figma-viewer>`;
  }

  private onNodeSelected(e: CustomEvent) {
    console.log(e.detail);
  }

  private onInit(e: CustomEvent) {
    this.zoomController = e.detail.zoomController;
  }

  private resetZoom() {
    this.zoomController.reset();
  }
}
