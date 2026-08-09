import { describe, expect, it } from "vitest";
import { HANDLES, handleAt, handleCursor, handlePoint, resizeRect } from "../../src/domain/handle";
import type { Rect } from "../../src/domain/rect";

/** 辺が十分に長いので、当たり判定は上限の 10px で効く。 */
const r: Rect = { x: 100, y: 100, w: 200, h: 120 };

describe("handlePoint", () => {
  it("puts the corners on the corners", () => {
    expect(handlePoint(r, "nw")).toEqual({ x: 100, y: 100 });
    expect(handlePoint(r, "ne")).toEqual({ x: 300, y: 100 });
    expect(handlePoint(r, "sw")).toEqual({ x: 100, y: 220 });
    expect(handlePoint(r, "se")).toEqual({ x: 300, y: 220 });
  });

  it("puts the edge handles at the midpoints", () => {
    expect(handlePoint(r, "n")).toEqual({ x: 200, y: 100 });
    expect(handlePoint(r, "s")).toEqual({ x: 200, y: 220 });
    expect(handlePoint(r, "w")).toEqual({ x: 100, y: 160 });
    expect(handlePoint(r, "e")).toEqual({ x: 300, y: 160 });
  });

  it("has eight of them", () => {
    expect(HANDLES).toHaveLength(8);
    expect(new Set(HANDLES).size).toBe(8);
  });
});

describe("handleAt", () => {
  it("catches a point right on a handle", () => {
    expect(handleAt(r, { x: 100, y: 100 })).toBe("nw");
    expect(handleAt(r, { x: 200, y: 220 })).toBe("s");
  });

  it("catches a point slightly off, so it can be grabbed by hand", () => {
    expect(handleAt(r, { x: 106, y: 94 })).toBe("nw");
  });

  it("prefers the corner where a corner and an edge overlap", () => {
    // 右下隅のすぐ内側。se と s と e のどれとも重なるが、斜めに伸ばせないと困る。
    expect(handleAt(r, { x: 297, y: 217 })).toBe("se");
  });

  it("leaves the middle alone, so shapes can still be drawn", () => {
    expect(handleAt(r, { x: 200, y: 160 })).toBeNull();
  });

  it("misses a point far outside", () => {
    expect(handleAt(r, { x: 50, y: 50 })).toBeNull();
  });

  it("keeps the middle drawable even for a small selection", () => {
    const small: Rect = { x: 0, y: 0, w: 30, h: 30 };
    expect(handleAt(small, { x: 0, y: 0 })).toBe("nw");
    expect(handleAt(small, { x: 15, y: 15 })).toBeNull();
  });
});

describe("resizeRect", () => {
  const min = 8;

  it("moves only the edge that was grabbed", () => {
    expect(resizeRect(r, "e", { x: 400, y: 999 }, min)).toEqual({
      x: 100,
      y: 100,
      w: 300,
      h: 120,
    });
  });

  it("moves both edges of a corner", () => {
    expect(resizeRect(r, "nw", { x: 50, y: 60 }, min)).toEqual({
      x: 50,
      y: 60,
      w: 250,
      h: 160,
    });
  });

  it("shrinks as well as grows", () => {
    expect(resizeRect(r, "s", { x: 0, y: 150 }, min)).toEqual({
      x: 100,
      y: 100,
      w: 200,
      h: 50,
    });
  });

  it("never flips, so the grabbed handle keeps its meaning", () => {
    const flipped = resizeRect(r, "e", { x: 0, y: 0 }, min);
    expect(flipped).toEqual({ x: 100, y: 100, w: min, h: 120 });
  });

  it("never flips when pulling a corner past the far side", () => {
    const flipped = resizeRect(r, "se", { x: -500, y: -500 }, min);
    expect(flipped).toEqual({ x: 100, y: 100, w: min, h: min });
  });

  it("leaves the rect alone when the pointer has not moved", () => {
    expect(resizeRect(r, "nw", { x: r.x, y: r.y }, min)).toEqual(r);
  });
});

describe("handleCursor", () => {
  it("points along the direction the edge will travel", () => {
    expect(handleCursor("nw")).toBe("nwse-resize");
    expect(handleCursor("se")).toBe("nwse-resize");
    expect(handleCursor("ne")).toBe("nesw-resize");
    expect(handleCursor("sw")).toBe("nesw-resize");
    expect(handleCursor("n")).toBe("ns-resize");
    expect(handleCursor("s")).toBe("ns-resize");
    expect(handleCursor("w")).toBe("ew-resize");
    expect(handleCursor("e")).toBe("ew-resize");
  });
});
