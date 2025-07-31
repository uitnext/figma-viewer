import * as d3 from "d3";
import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import panzoom, { type PanZoom } from "panzoom";
import { getDistanceGuides } from "./distance-guide";
import * as figma from "./figma";
import { createInlineStyles } from "./style";
import type { FigmaViewerOptions } from "./types";

interface FigmaNode extends figma.Node, figma.HasBoundingBox {}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SELECTION_STROKE_COLOR = "#961fe0";
const HOVER_STROKE_COLOR = "#1c6ced";
const DISTANCE_GUIDE_COLOR = "#1c6ced";
const LINE_LABEL_BACKGROUND_COLOR = "#f0134e";
const DIMENSION_BACKGROUND_COLOR = "#1864ab";
const STROKE_WIDTH = 1;
const FONT_SIZE = 14;

@customElement("canvas-element")
export class Canvas extends LitElement {
  @property()
  dimensions: {
    width: number;
    height: number;
  };

  @property()
  figmaImageUrl: string;

  @property()
  nodes: FigmaNode[];

  @property()
  rootNode: FigmaNode;

  @property()
  zoomLevel: number;

  @property()
  options?: FigmaViewerOptions;

  @state() private nodeSelected: FigmaNode;
  @state() private nodeHovered: FigmaNode | null;
  @state() private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;

  @state() scale = 1;

  @query("svg.fc-guide-canvas")
  mySvg: SVGSVGElement;

  @query("img")
  myImg: HTMLImageElement;

  @query("div.hitbox-layer")
  hitboxLayer: HTMLDivElement;

  @state()
  g: d3.Selection<SVGGElement, unknown, null, undefined>;

  @state()
  zoomController: PanZoom;

  static styles = css`
    .canvas {
      position: absolute;
    }
    .hitbox-layer {
      position: absolute;
      left: 0;
      top: 0;
    }
    .fc-hitbox {
      position: absolute;
    }
    .fc-hitbox[data-select-muted] {
      pointer-events: none;
    }
    .fc-guide-canvas {
      position: absolute;
      pointer-events: none;
      top: 0;
      left: 0;
    }
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 8rem;
    }
    .canvas-container {
      width: 100%;
    }
  `;

  protected render() {
    return html`<div class="canvas-container">
      <svg viewBox="0 0 ${this.dimensions.width} ${this.dimensions.height}">
        <foreignObject
          width="${this.dimensions.width}"
          height="${this.dimensions.height}"
        >
          ${this.renderContent()}
        </foreignObject>
      </svg>
    </div>`;
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    if (this.mySvg) {
      this.svg = d3
        .select(this.mySvg)
        .attr("width", this.dimensions.width)
        .attr("height", this.dimensions.height);

      this.g = this.svg.append("g");
    }

    if (this.myImg && this.options?.enablePanAndZoom) {
      this.zoomController = panzoom(this.myImg, {
        minZoom: 0.5,
        maxZoom: 4,
      });

      this.zoomController.on("transform", () => {
        const transformProperty = this.myImg.style.transform;
        this.hitboxLayer.style.transformOrigin = "0px 0px 0px";
        this.hitboxLayer.style.transform = transformProperty;
        this.g.attr("transform-origin", "0px 0px 0px");
        this.g.attr("transform", transformProperty);
      });
    }
  }

  private renderContent() {
    return html`<div class="canvas">
      <img
        src="${this.figmaImageUrl}"
        alt="Figma design"
        style="${createInlineStyles({
          width: this.dimensions.width + "px",
          height: this.dimensions.height + "px",
        })}"
      />
      <div
        class="hitbox-layer"
        style="${createInlineStyles({
          width: this.dimensions.width + "px",
          height: this.dimensions.height + "px",
        })}"
        @pointerup="${this.handlePointerUp}"
        @mousemove="${this.handleMouseMove}"
        @mouseleave="${this.handleMouseLeave}"
      >
        ${this.nodes.map((node) => this.renderHitbox(node))}
      </div>
      <svg class="fc-guide-canvas"></svg>
    </div>`;
  }

  private calculateRect(node: FigmaNode): Rect | null {
    if (!this.rootNode?.absoluteBoundingBox) {
      return null;
    }

    const rootBounds = this.rootNode.absoluteBoundingBox;
    const nodeBounds = node.absoluteBoundingBox;

    return {
      top: nodeBounds.y - rootBounds.y,
      left: nodeBounds.x - rootBounds.x,
      width: nodeBounds.width,
      height: nodeBounds.height,
    };
  }

  private handlePointerUp = (event: PointerEvent): void => {
    const nodeId = (event.target as HTMLElement)?.getAttribute("id");
    if (nodeId) {
      const node = this.nodes.find((n) => n.id === nodeId);
      if (node) {
        this.nodeSelected = node;
        const event = new CustomEvent("node-selected", {
          bubbles: true,
          composed: true,
          detail: this.nodeSelected,
        });
        this.dispatchEvent(event);
      }
    }
    this.svg.select("g").selectAll("*").remove();
    this.renderGuides();
  };

  private handleMouseMove = (event: PointerEvent): void => {
    const nodeId = (event.target as HTMLElement)?.getAttribute("id");
    if (nodeId) {
      const node = this.nodes.find((n) => n.id === nodeId);
      if (node) {
        this.nodeHovered = node;
        const event = new CustomEvent("node-hovered", {
          bubbles: true,
          composed: true,
          detail: this.nodeHovered,
        });
        this.dispatchEvent(event);
      }
    }

    this.svg.select("g").selectAll("*").remove();
    this.renderGuides();
  };

  private handleMouseLeave = (): void => {
    this.nodeHovered = null;
  };

  private renderGuides(): void {
    if (this.nodeHovered) {
      this.renderNodeOutline(this.nodeHovered, HOVER_STROKE_COLOR);
    }

    if (this.nodeSelected) {
      this.renderNodeOutline(this.nodeSelected, SELECTION_STROKE_COLOR);
      this.renderDimensionLabel(this.nodeSelected);
    }

    if (this.nodeHovered && this.nodeSelected) {
      this.renderDistanceGuides();
    }
  }

  private renderNodeOutline(node: FigmaNode, strokeColor: string): void {
    const rect = this.calculateRect(node);
    if (!rect) return;

    const cornerRadius = figma.hasRadius(node) ? node.cornerRadius : 0;

    this.g
      .append("rect")
      .attr("x", rect.left)
      .attr("y", rect.top)
      .attr("rx", cornerRadius)
      .attr("ry", cornerRadius)
      .attr("width", rect.width)
      .attr("height", rect.height)
      .attr("fill", "none")
      .attr("stroke", strokeColor)
      .attr("stroke-width", STROKE_WIDTH * this.zoomLevel);
  }

  private renderDimensionLabel(node: FigmaNode): void {
    const rect = this.calculateRect(node);
    if (!rect) return;

    const labelX = rect.left + rect.width / 2;
    const labelY = rect.top + rect.height + 5;
    const marginTop = 10 * this.zoomLevel;
    const padding = 6 * this.zoomLevel;
    const borderWidth = 1 * this.zoomLevel;
    const text = this.g
      .append("text")
      .attr("x", labelX)
      .attr("y", labelY + marginTop)
      .attr("text-anchor", "middle")
      .attr("font-size", FONT_SIZE * this.zoomLevel + "px")
      .attr("fill", "#fff")
      .text(`${Math.round(rect.width)} × ${Math.round(rect.height)}`);

    const bbox = text.node()?.getBBox();
    if (!bbox) {
      return;
    }
    // Background rectangle
    this.g
      .append("rect")
      .attr("x", labelX - bbox.width / 2 - padding / 2)
      .attr("y", labelY - borderWidth * 2)
      .attr("width", bbox?.width + padding)
      .attr("height", bbox?.height)
      .attr("fill", DIMENSION_BACKGROUND_COLOR);
    text.raise();
  }

  private renderDistanceGuides(): void {
    if (!this.nodeSelected || !this.nodeHovered || !this.rootNode) return;

    const guides = getDistanceGuides(
      this.nodeSelected.absoluteBoundingBox,
      this.nodeHovered.absoluteBoundingBox
    );

    const rootBounds = this.rootNode.absoluteBoundingBox;

    guides.forEach(({ points, bisector }) => {
      const horizontalLength = Math.abs(points[0].x - points[1].x);
      const verticalLength = Math.abs(points[0].y - points[1].y);

      if (horizontalLength === 0 && verticalLength === 0) return;

      this.renderGuideLine(points, rootBounds);
      this.renderGuideLabel(
        points,
        rootBounds,
        horizontalLength,
        verticalLength
      );

      if (bisector) {
        this.renderBisector(bisector, rootBounds);
      }
    });
  }

  private renderGuideLine(
    points: Array<{ x: number; y: number }>,
    rootBounds: figma.Rect
  ): void {
    this.g
      .append("line")
      .attr("x1", points[0].x - rootBounds.x)
      .attr("y1", points[0].y - rootBounds.y)
      .attr("x2", points[1].x - rootBounds.x)
      .attr("y2", points[1].y - rootBounds.y)
      .attr("stroke", DISTANCE_GUIDE_COLOR)
      .attr("stroke-width", STROKE_WIDTH * this.zoomLevel);
  }

  private renderGuideLabel(
    points: Array<{ x: number; y: number }>,
    rootBounds: figma.Rect,
    horizontalLength: number,
    verticalLength: number
  ): void {
    const distance = Math.round(Math.max(horizontalLength, verticalLength));
    const isHorizontal = horizontalLength > verticalLength;
    const constants = {
      padding: 6 * this.zoomLevel,
      marginTop: 18 * this.zoomLevel,
      marginRight: 8 * this.zoomLevel,
      borderWidth: 1 * this.zoomLevel,
      fontSize: FONT_SIZE * this.zoomLevel,
    };

    // Calculate center coordinates
    const centerX = (points[0].x + points[1].x) / 2 - rootBounds.x;
    const centerY = (points[0].y + points[1].y) / 2 - rootBounds.y;

    // Configure text properties
    const textConfig = {
      x: isHorizontal
        ? centerX
        : points[0].x - rootBounds.x + constants.marginRight,
      y: isHorizontal ? centerY + constants.marginTop : centerY,
      textAnchor: isHorizontal ? "middle" : "start",
      dominantBaseline: isHorizontal ? "baseline" : "middle",
    };

    // Create text element
    const text = this.g
      .append("text")
      .attr("x", textConfig.x)
      .attr("y", textConfig.y)
      .attr("text-anchor", textConfig.textAnchor)
      .attr("dominant-baseline", textConfig.dominantBaseline)
      .attr("font-size", `${constants.fontSize}px`)
      .attr("fill", "#fff")
      .text(distance);

    // Get text bounding box
    const textBBox = text.node()?.getBBox();
    if (!textBBox) return;

    // Configure background rectangle
    const rectConfig = {
      x: isHorizontal
        ? centerX - textBBox.width / 2 - constants.padding / 2
        : points[0].x -
          rootBounds.x -
          constants.padding / 2 +
          constants.marginRight,
      y: isHorizontal
        ? centerY -
          textBBox.height +
          constants.borderWidth * 2 +
          constants.marginTop
        : centerY - textBBox.height / 2 - constants.borderWidth * 2,
      width: textBBox.width + constants.padding,
      height: textBBox.height,
    };

    // Create background rectangle
    this.g
      .append("rect")
      .attr("x", rectConfig.x)
      .attr("y", rectConfig.y)
      .attr("width", rectConfig.width)
      .attr("height", rectConfig.height)
      .attr("fill", LINE_LABEL_BACKGROUND_COLOR);

    text.raise();
  }

  private renderBisector(
    bisector: Array<{ x: number; y: number }>,
    rootBounds: figma.Rect
  ): void {
    this.g
      .append("line")
      .attr("x1", bisector[0].x - rootBounds.x)
      .attr("y1", bisector[0].y - rootBounds.y)
      .attr("x2", bisector[1].x - rootBounds.x)
      .attr("y2", bisector[1].y - rootBounds.y)
      .attr("stroke", DISTANCE_GUIDE_COLOR)
      .attr("stroke-width", STROKE_WIDTH * this.zoomLevel)
      .attr("stroke-dasharray", 4 * this.zoomLevel);
  }

  private renderHitbox(node: FigmaNode) {
    const rect = this.calculateRect(node);
    if (!rect) return;

    const style = createInlineStyles({
      width: rect.width + "px",
      height: rect.height + "px",
      left: rect.left + "px",
      top: rect.top + "px",
    });

    return html`
      <div
        id="${node.id}"
        class="fc-hitbox"
        ?data-select-muted=${node.id === this.nodeSelected?.id}
        style="${style}"
      ></div>
    `;
  }
}
