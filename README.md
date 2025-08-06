# figma-viewer
[![npm version](https://img.shields.io/npm/v/uitnext-figma-viewer)](https://npmjs.com/package/uitnext-figma-viewer)
[![npm downloads](https://img.shields.io/npm/dm/uitnext-figma-viewer)](https://npm.chart.dev/uitnext-figma-viewer)

View figma design in web application, support react & lit element.

## Installation

```sh
npm install uitnext-figma-viewer
```

## Usage

Usage with react component

```tsx
import { ReactFigmaViewer } from "uitnext-figma-viewer";
function App() {
  function onNodeSelected(e: CustomEvent) {
    console.log(e.detail);
  }

  function onNodeHovered(e: CustomEvent) {
    console.log(e.detail);
  }

  function onLoaded(e: CustomEvent) {
    console.log(e.detail);
  }
  return (
    <ReactFigmaViewer
      accessToken={__YOUR_PERSONAL_ACCESS_TOKEN__}
      url={__FIGMA_LINK_SELECTION__}
      onNodeSelected={onNodeSelected}
      onNodeHovered={onNodeHovered}
      onLoaded={onLoaded}
    />
  );
}

export default App;
```

Usage with lit element

```typescript
import "@uitnext/figma-viewer";

import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("demo-greeting")
export class DemoGreeting extends LitElement {
  render() {
    return html`<figma-viewer
      .accessToken=${__YOUR_PERSONAL_ACCESS_TOKEN__}
      .url=${__FIGMA_LINK_SELECTION__}
      @node-selected=""
      @node-hovered=""
      @loaded=""
    ></figma-viewer>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-greeting": DemoGreeting;
  }
}
```

## props

| Property | Type | Default |
| :------- | :------: | -------: |
| enablePanAndZoom  | boolean  | false  |

## Events

| Lit Event | React Event |
| :------- | :------- |
| nodeSelected | onNodeSelected |
| nodeHovered | onNodeHovered |
| loaded | onLoaded |