import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import "./figma-viewer";
import type { FigmaViewerOptions } from "./types";

@customElement("demo-element")
export class FigmaViewer extends LitElement {
  protected render() {
    const options: FigmaViewerOptions = {
      enablePanAndZoom: true,
    };
    const figmaAccessToken = import.meta.env.VITE_FIGMA_ACCESS_TOKEN;
    return html`<figma-viewer
      .accessToken=${figmaAccessToken}
      url="https://www.figma.com/design/TFXcgvmT6q9KEY4vWYg8XE/Sample-Project---Localhost--Copy-?node-id=1-921&t=DtJIHDbK7DXQA7bo-4"
      .options=${options}
    ></figma-viewer>`;
  }
}
