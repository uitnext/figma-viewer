import { createComponent, type EventName } from "@lit/react";
import React from "react";
import { FigmaViewer } from "./figma-viewer";
export const ReactFigmaViewer = createComponent({
  tagName: "figma-viewer",
  elementClass: FigmaViewer,
  react: React,
  events: {
    onNodeSelected: "node-selected" as EventName<CustomEvent>,
    onNodeHovered: "node-hovered" as EventName<CustomEvent>,
    onInit: "init" as EventName<CustomEvent>,
  },
});
