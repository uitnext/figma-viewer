import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { Node } from "../figma";

@customElement("spinner-element")
export class Spinner extends LitElement {
  @property()
  node: Node | null = null;
  static styles = css`
    .loader {
      width: 24px;
      height: 24px;
      border: 2px solid #1976d2;
      border-bottom-color: transparent;
      border-radius: 50%;
      display: inline-block;
      box-sizing: border-box;
      animation: rotation 1s linear infinite;
    }

    @keyframes rotation {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `;
  protected render() {
    return html`<div class="loader"></div>`;
  }
}
