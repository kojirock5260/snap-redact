import { describe, expect, it } from "vitest";
import { clampPoint, contains, diagonal, toRect } from "../../src/domain/rect";

describe("toRect", () => {
  it("keeps a drag made toward the bottom right", () => {
    expect(toRect({ x0: 10, y0: 20, x1: 40, y1: 60 })).toEqual({ x: 10, y: 20, w: 30, h: 40 });
  });

  it("normalizes a drag made toward the top left", () => {
    expect(toRect({ x0: 40, y0: 60, x1: 10, y1: 20 })).toEqual({ x: 10, y: 20, w: 30, h: 40 });
  });

  it("returns zero size for a click without movement", () => {
    expect(toRect({ x0: 5, y0: 5, x1: 5, y1: 5 })).toEqual({ x: 5, y: 5, w: 0, h: 0 });
  });
});

describe("contains", () => {
  const r = { x: 10, y: 10, w: 100, h: 50 };

  it("accepts a point inside", () => {
    expect(contains(r, { x: 50, y: 30 })).toBe(true);
  });

  it("accepts a point exactly on the edge", () => {
    expect(contains(r, { x: 10, y: 10 })).toBe(true);
    expect(contains(r, { x: 110, y: 60 })).toBe(true);
  });

  it("rejects a point outside", () => {
    expect(contains(r, { x: 9, y: 30 })).toBe(false);
    expect(contains(r, { x: 50, y: 61 })).toBe(false);
  });
});

describe("clampPoint", () => {
  it("leaves a point inside alone", () => {
    expect(clampPoint({ x: 400, y: 300 }, 1280, 800)).toEqual({ x: 400, y: 300 });
  });

  it("pulls back a point dragged past the right and bottom", () => {
    expect(clampPoint({ x: 9999, y: 9999 }, 1280, 800)).toEqual({ x: 1280, y: 800 });
  });

  it("pulls back a negative point, which pointer capture can produce", () => {
    expect(clampPoint({ x: -50, y: -1 }, 1280, 800)).toEqual({ x: 0, y: 0 });
  });

  it("keeps the edges themselves, so the full width can be selected", () => {
    expect(clampPoint({ x: 0, y: 800 }, 1280, 800)).toEqual({ x: 0, y: 800 });
  });
});

describe("diagonal", () => {
  it("measures the straight distance regardless of direction", () => {
    expect(diagonal({ x0: 0, y0: 0, x1: 3, y1: 4 })).toBe(5);
    expect(diagonal({ x0: 3, y0: 4, x1: 0, y1: 0 })).toBe(5);
  });
});
