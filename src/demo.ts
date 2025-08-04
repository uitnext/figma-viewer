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
  protected render() {
    const options: FigmaViewerOptions = {
      enablePanAndZoom: true,
    };
    const figmaAccessToken = import.meta.env.VITE_FIGMA_ACCESS_TOKEN;
    return html`<figma-viewer
      .accessToken=${figmaAccessToken}
      url="https://www.figma.com/design/hxQ3tWN83F2bRjL2IyV3Pc/Hoffenberg---Beer-Company-Landing-Page-Redesign--Community-?node-id=326-97&t=cHSj7ShDWd2Qeezf-4"
      .options=${options}
      @node-selected=${this.onNodeSelected}
    ></figma-viewer>`;
  }

  private onNodeSelected(e: CustomEvent) {
    console.log(e.detail);
  }
}
