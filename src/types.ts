import * as figma from "./figma";

export type Hitbox = {
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
};

export interface FigmaNode extends figma.Node, figma.HasBoundingBox {}
export interface FigmaViewerOptions {
  enablePanAndZoom?: boolean;
}

export interface CSSStyle {
  propertyName: string;
  value: string | number;
}