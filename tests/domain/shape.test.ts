import { describe, expect, it } from "vitest";
import { arrowGeometry, COLORS, isDrawable, type Shape, TOOLS } from "../../src/domain/shape";

const shape = (over: Partial<Shape>): Shape => ({
  x0: 0,
  y0: 0,
  x1: 0,
  y1: 0,
  tool: "box",
  color: "#ef4444",
  ...over,
});

describe("TOOLS", () => {
  it("has a unique key per tool", () => {
    expect(new Set(TOOLS.map((t) => t.key)).size).toBe(TOOLS.length);
  });
});

describe("isDrawable", () => {
  it("keeps a box with enough width and height", () => {
    expect(isDrawable(shape({ tool: "box", x1: 20, y1: 20 }))).toBe(true);
  });

  it("drops a box that is only a stray click", () => {
    expect(isDrawable(shape({ tool: "box", x1: 2, y1: 2 }))).toBe(false);
  });

  it("keeps a horizontal arrow even though its height is zero", () => {
    expect(isDrawable(shape({ tool: "arrow", x1: 60, y1: 0 }))).toBe(true);
  });

  it("keeps a vertical arrow even though its width is zero", () => {
    expect(isDrawable(shape({ tool: "arrow", x1: 0, y1: 60 }))).toBe(true);
  });

  it("drops an arrow that is too short to see", () => {
    expect(isDrawable(shape({ tool: "arrow", x1: 5, y1: 0 }))).toBe(false);
  });

  it("judges fill by area, like a box", () => {
    expect(isDrawable(shape({ tool: "fill", x1: 30, y1: 10 }))).toBe(true);
    expect(isDrawable(shape({ tool: "fill", x1: 30, y1: 1 }))).toBe(false);
  });
});

describe("arrowGeometry", () => {
  const head = 15;

  it("puts the tip at the end of the drag", () => {
    const g = arrowGeometry({ x0: 0, y0: 0, x1: 100, y1: 0 }, head);
    expect(g.tip).toEqual({ x: 100, y: 0 });
  });

  it("pulls the line end back inside the head", () => {
    const g = arrowGeometry({ x0: 0, y0: 0, x1: 100, y1: 0 }, head);
    expect(g.base.x).toBeCloseTo(100 - head * 0.85);
    expect(g.base.y).toBeCloseTo(0);
  });

  it("spreads the barbs symmetrically around the shaft", () => {
    const g = arrowGeometry({ x0: 0, y0: 0, x1: 100, y1: 0 }, head);
    expect(g.left.x).toBeCloseTo(g.right.x);
    expect(g.left.y).toBeCloseTo(-g.right.y);
  });

  it("rotates with the drag direction", () => {
    const g = arrowGeometry({ x0: 0, y0: 0, x1: 0, y1: 100 }, head);
    expect(g.base.x).toBeCloseTo(0);
    expect(g.base.y).toBeCloseTo(100 - head * 0.85);
  });
});

describe("COLORS", () => {
  it("has no duplicates", () => {
    expect(new Set(COLORS).size).toBe(COLORS.length);
  });
});
