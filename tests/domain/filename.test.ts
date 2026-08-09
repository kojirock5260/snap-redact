import { describe, expect, it } from "vitest";
import { snapFileName } from "../../src/domain/filename";

describe("snapFileName", () => {
  it("formats as snap-YYYYMMDD-HHmmss.png", () => {
    expect(snapFileName(new Date(2026, 7, 9, 21, 49, 55))).toBe("snap-20260809-214955.png");
  });

  it("pads single digit parts", () => {
    expect(snapFileName(new Date(2026, 0, 2, 3, 4, 5))).toBe("snap-20260102-030405.png");
  });

  it("gives different names one second apart, so nothing is overwritten", () => {
    const a = snapFileName(new Date(2026, 7, 9, 21, 49, 55));
    const b = snapFileName(new Date(2026, 7, 9, 21, 49, 56));
    expect(a).not.toBe(b);
  });
});
