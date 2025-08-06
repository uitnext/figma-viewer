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
  protected render() {
    const options: FigmaViewerOptions = {
      enablePanAndZoom: true,
    };
    const figmaAccessToken = import.meta.env.VITE_FIGMA_ACCESS_TOKEN;
    return html` <figma-viewer
      .accessToken=${figmaAccessToken}
      url="https://www.figma.com/design/pkDMG0NmBh9G52B57JNWN5/-INTERNAL--GENSAI-Platform_design?node-id=6344-2613&t=FJFU2QZuiOn6eHa5-4"
      .options=${options}
      @node-selected=${this.onNodeSelected}
      @loaded=${this.onLoaded}
    ></figma-viewer>`;
  }

  private onNodeSelected(e: CustomEvent) {
    console.log(e.detail);
  }

  private onLoaded(e: CustomEvent) {
    console.log("onLoaded", e);
  }
}
