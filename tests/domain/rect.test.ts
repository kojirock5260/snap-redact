import { describe, expect, it } from "vitest";
import { contains, diagonal, EDGE_SNAP, snapPoint, toRect } from "../../src/domain/rect";

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

describe("snapPoint / clamping", () => {
  it("leaves a point inside alone", () => {
    expect(snapPoint({ x: 400, y: 300 }, 1280, 800, 0)).toEqual({ x: 400, y: 300 });
  });

  it("pulls back a point dragged past the right and bottom", () => {
    expect(snapPoint({ x: 9999, y: 9999 }, 1280, 800, 0)).toEqual({ x: 1280, y: 800 });
  });

  it("pulls back a negative point, which pointer capture can produce", () => {
    expect(snapPoint({ x: -50, y: -1 }, 1280, 800, 0)).toEqual({ x: 0, y: 0 });
  });

  it("keeps the edges themselves, so the full width can be selected", () => {
    expect(snapPoint({ x: 0, y: 800 }, 1280, 800, 0)).toEqual({ x: 0, y: 800 });
  });
});

describe("snapPoint / edge snapping", () => {
  // DevTools のデバイスモードでいちばん困る大きさ。iPhone 16 Pro Max 相当。
  const w = 440;
  const h = 956;

  it("pulls a near-miss at the top left onto the corner", () => {
    expect(snapPoint({ x: 5, y: 3 }, w, h, EDGE_SNAP)).toEqual({ x: 0, y: 0 });
  });

  it("pulls a near-miss at the bottom right onto the corner", () => {
    expect(snapPoint({ x: w - 5, y: h - 3 }, w, h, EDGE_SNAP)).toEqual({ x: w, y: h });
  });

  it("snaps one axis without dragging the other along", () => {
    expect(snapPoint({ x: 4, y: 400 }, w, h, EDGE_SNAP)).toEqual({ x: 0, y: 400 });
  });

  it("leaves a point just outside the snap distance where it is", () => {
    expect(snapPoint({ x: EDGE_SNAP + 1, y: 400 }, w, h, EDGE_SNAP)).toEqual({
      x: EDGE_SNAP + 1,
      y: 400,
    });
  });

  it("takes the edge exactly at the snap distance, so the boundary is inclusive", () => {
    expect(snapPoint({ x: EDGE_SNAP, y: 400 }, w, h, EDGE_SNAP)).toEqual({ x: 0, y: 400 });
  });

  it("keeps the middle reachable in a frame narrower than twice the snap distance", () => {
    // 上限が無いと 20px 幅では全域が端に吸われ、真ん中を指せなくなる。
    expect(snapPoint({ x: 10, y: 10 }, 20, 20, EDGE_SNAP)).toEqual({ x: 10, y: 10 });
  });
});

describe("diagonal", () => {
  it("measures the straight distance regardless of direction", () => {
    expect(diagonal({ x0: 0, y0: 0, x1: 3, y1: 4 })).toBe(5);
    expect(diagonal({ x0: 3, y0: 4, x1: 0, y1: 0 })).toBe(5);
  });
});
