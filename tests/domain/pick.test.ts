import { describe, expect, it } from "vitest";
import { pickRect } from "../../src/domain/pick";
import type { Rect } from "../../src/domain/rect";

const frame = { w: 1280, h: 800 };
const min = 8;

describe("pickRect", () => {
  it("takes the frontmost element", () => {
    const rects: Rect[] = [
      { x: 100, y: 100, w: 50, h: 20 },
      { x: 0, y: 0, w: 600, h: 400 },
    ];
    expect(pickRect(rects, frame, min)).toEqual({ x: 100, y: 100, w: 50, h: 20 });
  });

  it("returns null when there is nothing under the pointer", () => {
    expect(pickRect([], frame, min)).toBeNull();
  });

  it("rounds outward so no edge pixel of the element is left uncovered", () => {
    expect(pickRect([{ x: 10.4, y: 20.6, w: 30.2, h: 10.1 }], frame, min)).toEqual({
      x: 10,
      y: 20,
      w: 31,
      h: 11,
    });
  });

  it("clips an element that runs past the frame, since the rest was not captured", () => {
    expect(pickRect([{ x: 1200, y: -50, w: 300, h: 200 }], frame, min)).toEqual({
      x: 1200,
      y: 0,
      w: 80,
      h: 150,
    });
  });

  it("skips an element that is too small and falls through to the next", () => {
    const rects: Rect[] = [
      { x: 100, y: 100, w: 4, h: 4 },
      { x: 90, y: 90, w: 40, h: 40 },
    ];
    expect(pickRect(rects, frame, min)).toEqual({ x: 90, y: 90, w: 40, h: 40 });
  });

  it("skips an element that is almost entirely off screen", () => {
    const rects: Rect[] = [
      { x: -100, y: 100, w: 103, h: 50 },
      { x: 0, y: 0, w: 300, h: 300 },
    ];
    expect(pickRect(rects, frame, min)).toEqual({ x: 0, y: 0, w: 300, h: 300 });
  });

  it("skips an element covering the whole frame, which select-all already handles", () => {
    expect(pickRect([{ x: 0, y: 0, w: 1280, h: 800 }], frame, min)).toBeNull();
    expect(pickRect([{ x: -10, y: -10, w: 5000, h: 5000 }], frame, min)).toBeNull();
  });

  it("looks through a full-screen backdrop to the element beneath it", () => {
    const rects: Rect[] = [
      { x: 0, y: 0, w: 1280, h: 800 },
      { x: 300, y: 200, w: 400, h: 300 },
    ];
    expect(pickRect(rects, frame, min)).toEqual({ x: 300, y: 200, w: 400, h: 300 });
  });

  it("keeps a full-width element that is not full-height, like a header", () => {
    expect(pickRect([{ x: 0, y: 0, w: 1280, h: 60 }], frame, min)).toEqual({
      x: 0,
      y: 0,
      w: 1280,
      h: 60,
    });
  });
});
