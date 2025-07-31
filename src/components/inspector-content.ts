import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { Node } from "../figma";

@customElement("node-inspector-element")
export class NodeInspector extends LitElement {
  @property()
  node: Node | null = null;
  protected render() {
    console.log(this.node);
    return html`<div class="node-inspector">
      <div>
        <div>Type</div>
        <div>${this.node?.type}</div>
      </div>
    </div>`;
  }
}
