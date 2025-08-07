import * as d3 from "d3";
import {
  css,
  html,
  LitElement,
  type CSSResultGroup,
  type PropertyValues,
} from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { getDistanceGuides } from "./distance-guide";
import * as figma from "./figma";
import { FigmaRest } from "./figma-rest";
import { fromNode } from "./from-node";
import type { FigmaNode } from "./types";
import { urlToBase64 } from "./utils";

const FIGMA_API_BASE_URL = "https://api.figma.com";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const HOVER_STROKE_COLOR = "#1c6ced";
const DISTANCE_GUIDE_COLOR = "#1c6ced";
const LINE_LABEL_BACKGROUND_COLOR = "#f0134e";
const DIMENSION_BACKGROUND_COLOR = "#1864ab";
const STROKE_WIDTH = 1;
const FONT_SIZE = 14;

@customElement("figma-viewer")
export class FigmaViewer extends LitElement {
  static styles?: CSSResultGroup | undefined = css`
    .figma-viewer {
      width: 100%;
      height: 100%;
    }
  `;
  @query("svg")
  svg: SVGSVGElement;

  @property()
  accessToken: string;

  @property()
  url: string;

  @state() private nodeSelected: d3.Selection<any, unknown, null, undefined>;
  @state() private nodeHovered: d3.Selection<any, unknown, null, undefined>;

  @state()
  allNodes: FigmaNode[] = [];

  @state()
  scale = 1;

  @state()
  g: d3.Selection<SVGGElement, unknown, null, undefined>;

  @state()
  image: HTMLImageElement;

  @state()
  imageBas64: string;

  #figmaRest: FigmaRest;
  protected async firstUpdated(_changedProperties: PropertyValues) {
    this.#figmaRest = new FigmaRest(FIGMA_API_BASE_URL, {
      accessToken: this.accessToken,
    });
    const { fileKey, nodeId } = this.#parseUrl();
    const elm = this.shadowRoot?.querySelector("div.figma-viewer");

    if (fileKey && nodeId && elm) {
      const [rootNode, imageUrl] = await Promise.all([
        this.#figmaRest.getFigmaSpec(fileKey, nodeId),
        this.#figmaRest.getFigmaImage(fileKey, nodeId),
      ]);

      this.imageBas64 = (await urlToBase64(imageUrl)) as string;

      if (!figma.hasBoundingBox(rootNode)) {
        return;
      }

      this.image = new Image();
      this.image.onload = () => {
        const width = this.image.width;
        const height = this.image.height;
        const scaleFactor = width / elm.clientWidth;
        this.scale = scaleFactor;

        window.onresize = () => {
          this.scale = width / elm.clientWidth;
          svg.call(zoom.transform, d3.zoomIdentity.scale(1 / this.scale));
        };

        const svg = d3
          .select(this.svg)
          .attr("width", "100%")
          .attr("height", "100%");
        const g = svg.append("g");
        this.g = g;

        const zoom: any = d3
          .zoom()
          .scaleExtent([0.5, 5])
          .filter(function (event) {
            return !event.type.includes("dblclick");
          })
          .on("zoom", (event) => {
            this.scale = 1 / event.transform.k;
            g.attr("transform", event.transform);
            this.#draw(rootNode);
          });
        svg.call(zoom);
        svg.call(zoom.transform, d3.zoomIdentity.scale(1 / this.scale));
        this.#drawBackgroundImage(width, height, imageUrl);
        this.g.on("mousemove", (e) => {
          const targetNode = d3.select(e.target);
          this.nodeHovered = targetNode;
          this.#draw(rootNode);

          const figmaNodeHovered = this.allNodes.find(
            (node) => node.id === this.nodeSelected?.attr("id")
          ) as FigmaNode & figma.HasStyles;
          if (figmaNodeHovered) {
            figmaNodeHovered.styles = fromNode(figmaNodeHovered);
            const event = new CustomEvent("node-hovered", {
              bubbles: true,
              composed: true,
              detail: figmaNodeHovered,
            });
            this.dispatchEvent(event);
          }
        });

        this.g.on("mousedown", (e) => {
          const targetNode = d3.select(e.target);
          this.g.selectAll(".figma-node").style("pointer-events", "all");
          targetNode.style("pointer-events", "none");
          this.nodeSelected = targetNode;
          this.#draw(rootNode);
          const figmaNodeSelected = this.allNodes.find(
            (node) => node.id === this.nodeSelected?.attr("id")
          ) as FigmaNode & figma.HasStyles;
          if (figmaNodeSelected) {
            figmaNodeSelected.styles = fromNode(figmaNodeSelected);
            const event = new CustomEvent("node-selected", {
              bubbles: true,
              composed: true,
              detail: figmaNodeSelected,
            });
            this.dispatchEvent(event);
          }
        });
        this.#drawNodes(rootNode);
        const nodes = this.allNodes.map((node) => ({
          ...node,
          styles: fromNode(node),
        }));

        const event = new CustomEvent("loaded", {
          bubbles: true,
          composed: true,
          detail: {
            svg: this.svg,
            nodes: nodes,
            controller: {
              exportImage: (node: FigmaNode) => {
                return new Promise((resolve, reject) => {
                  if (!node || !figma.hasBoundingBox(node)) {
                    return reject("Can't find any node to selected.");
                  }
                  const rect = this.#calculateRect(rootNode, node);
                  if (rect) {
                    const image = new Image();
                    image.onload = () => {
                      const canvas = document.createElement("canvas");
                      const ctx = canvas.getContext("2d");
                      canvas.width = rect?.width;
                      canvas.height = rect?.height;
                      ctx?.drawImage(
                        image,
                        rect.left,
                        rect.top,
                        rect?.width,
                        rect?.height,
                        0,
                        0,
                        rect?.width,
                        rect?.height
                      );
                      const croppedImageData = canvas.toDataURL("image/png");
                      resolve(croppedImageData);
                    };
                    image.src = this.imageBas64;
                  } else {
                    reject("unknown error");
                  }
                });
              },
            },
          },
        });

        this.dispatchEvent(event);
      };
      this.image.crossOrigin = "Anonymous";
      this.image.src = imageUrl;
    }
  }

  protected render() {
    return html`<div class="figma-viewer">
      <svg></svg>
    </div>`;
  }

  #clearOnHover() {
    this.g.selectAll(".node-hover-stroke").remove();
    this.g.selectAll("line").remove();
    this.g.selectAll(".distance-label-text").remove();
    this.g.selectAll(".distance-label-bg").remove();
  }

  #clearOnSelect() {
    this.g.selectAll(".node-select-stroke").remove();
    this.g.selectAll(".dimension-label").remove();
    this.g.selectAll(".dimension-label-bg").remove();
  }

  #draw(rootNode: FigmaNode) {
    if (this.nodeHovered) {
      this.#clearOnHover();
      this.#drawNodeStroke(this.nodeHovered, {
        className: "node-hover-stroke",
        strokeColor: HOVER_STROKE_COLOR,
      });
      this.#drawGuideLines(rootNode);
      if (this.nodeSelected) {
      }
    }

    if (this.nodeSelected) {
      this.#clearOnSelect();
      this.#drawNodeStroke(this.nodeSelected, {
        className: "node-select-stroke",
        strokeColor: "blue",
      });
      this.#drawDimension();
    }
  }

  #drawNodes(rootNode: FigmaNode) {
    for (const child of figma.walk(rootNode)) {
      if (figma.hasBoundingBox(child)) {
        this.allNodes.push(child);
        const rect = this.#calculateRect(rootNode, child);
        const cornerRadius = figma.hasRadius(rootNode)
          ? rootNode.cornerRadius
          : 0;

        if (rect) {
          this.g
            .append("rect")
            .classed("figma-node", true)
            .attr("id", child.id)
            .attr("width", rect.width)
            .attr("height", rect.height)
            .attr("fill", "transparent")
            .attr("x", rect.left)
            .attr("y", rect.top)
            .attr("rx", cornerRadius)
            .attr("ry", cornerRadius);
        }
      }
    }
  }

  #drawNodeStroke(
    node: d3.Selection<any, unknown, null, undefined>,
    options: {
      className: string;
      strokeColor?: string;
    }
  ) {
    const z = node.clone(true);
    z.attr("stroke", options.strokeColor || "#000")
      .attr("stroke-width", 1 * this.scale)
      .classed(options.className, true)
      .style("pointer-events", "none");
    this.g.append(() => z.node());
  }

  #drawBackgroundImage(width: number, height: number, imageUrl: string) {
    this.g
      .append("svg:image")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .attr("xlink:href", imageUrl);
  }

  #drawGuideLines(rootNode: FigmaNode) {
    const selectedAbsoluteBoundingBox = this.allNodes.find(
      (node) => node.id === this.nodeSelected?.attr("id")
    )?.absoluteBoundingBox;
    const compareAbsoluteBoundingBox = this.allNodes.find(
      (node) => node.id === this.nodeHovered.attr("id")
    )?.absoluteBoundingBox;
    if (!selectedAbsoluteBoundingBox || !compareAbsoluteBoundingBox) {
      return;
    }
    const distanceGuides = getDistanceGuides(
      selectedAbsoluteBoundingBox,
      compareAbsoluteBoundingBox
    );
    distanceGuides.forEach(({ points, bisector }) => {
      const horizontalLength = Math.abs(points[0].x - points[1].x);
      const verticalLength = Math.abs(points[0].y - points[1].y);

      if (horizontalLength === 0 && verticalLength === 0) return;
      const rootBounds = rootNode.absoluteBoundingBox;

      // draw line
      this.g
        .append("line")
        .attr("x1", points[0].x - rootBounds.x)
        .attr("y1", points[0].y - rootBounds.y)
        .attr("x2", points[1].x - rootBounds.x)
        .attr("y2", points[1].y - rootBounds.y)
        .attr("stroke", DISTANCE_GUIDE_COLOR)
        .attr("stroke-width", STROKE_WIDTH * this.scale);

      // draw label
      const distance = Math.round(Math.max(horizontalLength, verticalLength));
      const isHorizontal = horizontalLength > verticalLength;
      const constants = {
        padding: 6 * this.scale,
        marginTop: 18 * this.scale,
        marginRight: 8 * this.scale,
        borderWidth: 1 * this.scale,
        fontSize: 16 * this.scale,
      };

      const centerX = (points[0].x + points[1].x) / 2 - rootBounds.x;
      const centerY = (points[0].y + points[1].y) / 2 - rootBounds.y;
      const textConfig = {
        x: isHorizontal
          ? centerX
          : points[0].x - rootBounds.x + constants.marginRight,
        y: isHorizontal ? centerY + constants.marginTop : centerY,
        textAnchor: isHorizontal ? "middle" : "start",
        dominantBaseline: isHorizontal ? "baseline" : "middle",
      };
      const text = this.g
        .append("text")
        .classed("distance-label-text", true)
        .style("pointer-events", "none")
        .attr("x", textConfig.x)
        .attr("y", textConfig.y)
        .attr("text-anchor", textConfig.textAnchor)
        .attr("dominant-baseline", textConfig.dominantBaseline)
        .attr("font-size", `${constants.fontSize}px`)
        .attr("fill", "#fff")
        .text(distance);

      const textBBox = text.node()?.getBBox();
      if (textBBox) {
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
          .classed("distance-label-bg", true)
          .style("pointer-events", "none")
          .attr("x", rectConfig.x)
          .attr("y", rectConfig.y)
          .attr("width", rectConfig.width)
          .attr("height", rectConfig.height)
          .attr("fill", LINE_LABEL_BACKGROUND_COLOR);

        text.raise();
      }
      // Configure background rectangle

      if (bisector) {
        this.g
          .append("line")
          .style("pointer-events", "none")
          .attr("x1", bisector[0].x - rootBounds.x)
          .attr("y1", bisector[0].y - rootBounds.y)
          .attr("x2", bisector[1].x - rootBounds.x)
          .attr("y2", bisector[1].y - rootBounds.y)
          .attr("stroke", DISTANCE_GUIDE_COLOR)
          .attr("stroke-width", 1 * this.scale)
          .attr("stroke-dasharray", 4 * this.scale);
      }
    });
  }

  #drawDimension() {
    const targetX = Number(this.nodeSelected.attr("x"));
    const targetY = Number(this.nodeSelected.attr("y"));
    const targetW = Number(this.nodeSelected.attr("width"));
    const targetH = Number(this.nodeSelected.attr("height"));
    const marginTop = 16 * this.scale;
    const borderWidth = 1 * this.scale;
    const padding = 6 * this.scale;

    const labelX = targetX + targetW / 2;
    const labelY = targetY + targetH;

    const text = this.g
      .append("text")
      .classed("dimension-label", true)
      .attr("x", labelX)
      .attr("y", labelY + marginTop)
      .attr("text-anchor", "middle")
      .attr("font-size", FONT_SIZE * this.scale + "px")
      .attr("fill", "#fff")
      .text(`${Math.round(targetW)} × ${Math.round(targetH)}`);

    const bbox = text.node()?.getBBox();
    if (bbox) {
      this.g
        .append("rect")
        .classed("dimension-label-bg", true)
        .attr("x", labelX - bbox.width / 2 - padding / 2)
        .attr("y", labelY + marginTop - bbox.height + borderWidth * 2)
        .attr("width", bbox?.width + padding)
        .attr("height", bbox?.height)
        .attr("fill", DIMENSION_BACKGROUND_COLOR);
    }
    text.raise();
  }
  #parseUrl(): { fileKey: string | null; nodeId: string | null } {
    try {
      const url = new URL(this.url);
      const fileKey = url.pathname.split("/")[2];
      const nodeId = url.searchParams.get("node-id")?.replace("-", ":") || null;
      return { fileKey, nodeId };
    } catch (error) {
      console.error("Failed to parse URL:", error);
      return { fileKey: null, nodeId: null };
    }
  }

  #calculateRect(rootNode: figma.Node, node: FigmaNode): Rect | null {
    if (!figma.hasBoundingBox(rootNode)) {
      return null;
    }

    const rootBounds = rootNode.absoluteBoundingBox;
    const nodeBounds = node.absoluteBoundingBox;

    return {
      top: nodeBounds.y - rootBounds.y,
      left: nodeBounds.x - rootBounds.x,
      width: nodeBounds.width,
      height: nodeBounds.height,
    };
  }
}
