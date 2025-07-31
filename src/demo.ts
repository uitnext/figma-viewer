import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import "./figma-viewer";
import type { FigmaViewerOptions } from "./types";

@customElement("demo-element")
export class FigmaViewer extends LitElement {
  protected render() {
    const options: FigmaViewerOptions = {
      enablePanAndZoom: false,
    };
    const figmaAccessToken = import.meta.env.VITE_FIGMA_ACCESS_TOKEN;
    return html`<figma-viewer
      .accessToken=${figmaAccessToken}
      url="https://www.figma.com/design/Klm6pxIZSaJFiOMX5FpTul9F/storybook-addon-designs-sample?node-id=64-1&t=4hbIExKhQZeOMUXV-4"
      .options=${options}
    ></figma-viewer>`;
  }
}
