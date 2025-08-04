import { isTransparent } from "./colors";
import * as figma from "./figma";
import type { CSSStyle } from "./types";

export function fromNode(node: figma.Node) {
  const styles: CSSStyle[] = [];
  if (figma.hasBoundingBox(node)) {
    styles.push(
      {
        propertyName: "width",
        value: px(node.absoluteBoundingBox.width),
      },
      {
        propertyName: "height",
        value: px(node.absoluteBoundingBox.height),
      }
    );
  }
  if (figma.hasPadding(node)) {
    styles.push({
      propertyName: "padding",
      value: padding(
        node.paddingTop,
        node.paddingRight,
        node.paddingBottom,
        node.paddingLeft
      ),
    });
  } else if (figma.hasLegacyPadding(node)) {
    styles.push({
      propertyName: "padding",
      value: padding(
        node.verticalPadding,
        node.horizontalPadding,
        node.verticalPadding,
        node.horizontalPadding
      ),
    });
  }
  if (figma.hasTypeStyle(node)) {
    styles.push(
      {
        propertyName: "font-family",
        value: node.style.fontFamily,
      },
      {
        propertyName: "font-size",
        value: px(node.style.fontSize),
      },
      {
        propertyName: "font-weight",
        value: node.style.fontWeight,
      },
      {
        propertyName: "line-height",
        value: px(node.style.lineHeightPx),
      },
      {
        propertyName: "text-align",
        value:
          node.style.textAlignHorizontal === "JUSTIFIED"
            ? "justify"
            : node.style.textAlignHorizontal.toLowerCase(),
      }
    );

    if (node.style.letterSpacing) {
      styles.push({
        propertyName: "letter-spacing",
        value: px(node.style.letterSpacing),
      });
    }

    if (node.style.italic) {
      styles.push({
        propertyName: "font-style",
        value: "italic",
      });
    }

    switch (node.style.textCase) {
      case "LOWER":
        styles.push({
          propertyName: "text-transform",
          value: "lowercase",
        });
        break;
      case "UPPER":
        styles.push({
          propertyName: "text-transform",
          value: "uppercase",
        });
        break;
      case "TITLE":
        styles.push({
          propertyName: "text-transform",
          value: "capitalize",
        });
        break;
    }
  }

  if (figma.hasFills(node)) {
    const visibleFills = node.fills.filter((fill) => fill.visible !== false);
    const fill = visibleFills[0];
    if (node.type === "TEXT" && fill.type === "SOLID") {
      styles.push({
        propertyName: "color",
        value: colorToValue(fill.color),
      });
    }
  }

  if (figma.hasStroke(node) && node.strokes[0]) {
    const stroke = node.strokes[0];
    if (stroke.type === "SOLID") {
      styles.push({
        propertyName: "border",
        value: `${px(node.strokeWeight)} solid ${colorToValue(stroke.color)}`,
      });
    }
  }

  if (figma.hasRadius(node) && node.cornerRadius > 0) {
    styles.push({
      propertyName: "border-radius",
      value: px(node.cornerRadius),
    });
  } else if (figma.hasRadii(node)) {
    // const [head, ...tail] = node.rectangleCornerRadii;
    styles.push({
      propertyName: "border-radius",
      value: "unimplemented",
    });
  }

  if (figma.hasEffects(node)) {
    const { shadows, layerBlurs, bgBlurs } = node.effects.reduce<{
      shadows: readonly figma.ShadowEffect[];
      layerBlurs: readonly figma.Effect[];
      bgBlurs: readonly figma.Effect[];
    }>(
      ({ shadows, layerBlurs, bgBlurs }, effect) => {
        if (!effect.visible) {
          return { shadows, layerBlurs, bgBlurs };
        }

        if (figma.isShadowEffect(effect)) {
          return { shadows: [...shadows, effect], layerBlurs, bgBlurs };
        }

        switch (effect.type) {
          case "LAYER_BLUR":
            return { shadows, layerBlurs: [...layerBlurs, effect], bgBlurs };
          case "BACKGROUND_BLUR":
            return { shadows, layerBlurs, bgBlurs: [...bgBlurs, effect] };
          default:
            return { shadows, layerBlurs, bgBlurs };
        }
      },
      { shadows: [], layerBlurs: [], bgBlurs: [] }
    );

    if (shadows.length > 0) {
      styles.push({
        propertyName: "box-shadow",
        value: shadow(shadows[0]),
      });
    }

    if (layerBlurs.length > 0) {
      styles.push({
        propertyName: "filter",
        value: `blur(${px(layerBlurs[0].radius)})`,
      });
    }

    if (bgBlurs.length > 0) {
      styles.push({
        propertyName: "backdrop-filter",
        value: `blur(${px(bgBlurs[0].radius)})`,
      });
    }
  }

  return styles;
}

function px(size: number): string {
  return Number(size.toFixed(2)) + "px";
}

function padding(top: number, right: number, bottom: number, left: number) {
  return `${px(top)} ${px(right)} ${px(bottom)} ${px(left)}`;
}

function colorToValue(color: figma.Color): string {
  if (isTransparent(color)) {
    return "transparent";
  }
  return toHex(color);
}

function toHex(color: figma.Color): string {
  const r = (color.r * 0xff) | 0;
  const g = (color.g * 0xff) | 0;
  const b = (color.b * 0xff) | 0;
  const a = color.a;

  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0") +
    (a === 1 ? "" : ((a * 0xff) | 0).toString(16).padStart(2, "0"))
  );
}

function shadow(shadow: figma.ShadowEffect) {
  const { color, offset, radius } = shadow;
  const { r, g, b, a } = color;
  const { x, y } = offset;

  const colorString = `rgba(${r}, ${g}, ${b}, ${a})`;
  return `${x}px ${y}px ${radius}px ${colorString}`;
}
