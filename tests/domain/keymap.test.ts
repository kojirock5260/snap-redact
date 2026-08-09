import { describe, expect, it } from "vitest";
import { type KeyContext, resolveKey } from "../../src/domain/keymap";

const annotate: KeyContext = { phase: "annotate", helpOpen: false, drawing: false };
const selecting: KeyContext = { phase: "select", helpOpen: false, drawing: false };
const key = (k: string, m: Partial<{ meta: boolean; ctrl: boolean }> = {}) => ({
  key: k,
  meta: m.meta ?? false,
  ctrl: m.ctrl ?? false,
});

describe("resolveKey / Escape", () => {
  it("cancels while selecting", () => {
    expect(resolveKey(key("Escape"), selecting)).toEqual({ type: "cancel" });
  });

  it("cancels while annotating", () => {
    expect(resolveKey(key("Escape"), annotate)).toEqual({ type: "cancel" });
  });

  it("closes the help first when it is open, instead of cancelling", () => {
    expect(resolveKey(key("Escape"), { ...annotate, helpOpen: true })).toEqual({
      type: "closeHelp",
    });
  });

  it("drops only the shape being drawn, so the capture survives", () => {
    expect(resolveKey(key("Escape"), { ...annotate, drawing: true })).toEqual({
      type: "cancelDrag",
    });
  });

  it("drops only the selection being dragged", () => {
    expect(resolveKey(key("Escape"), { ...selecting, drawing: true })).toEqual({
      type: "cancelDrag",
    });
  });

  it("still closes the help first while drawing", () => {
    expect(resolveKey(key("Escape"), { ...annotate, drawing: true, helpOpen: true })).toEqual({
      type: "closeHelp",
    });
  });

  it("cancels for real once nothing is being drawn", () => {
    expect(resolveKey(key("Escape"), { ...annotate, drawing: false })).toEqual({ type: "cancel" });
  });
});

describe("resolveKey / before a region is chosen", () => {
  it("ignores tool keys", () => {
    expect(resolveKey(key("1"), selecting)).toBeNull();
  });

  it("ignores copy", () => {
    expect(resolveKey(key("c", { meta: true }), selecting)).toBeNull();
  });
});

describe("resolveKey / output", () => {
  it("copies with the command key", () => {
    expect(resolveKey(key("c", { meta: true }), annotate)).toEqual({ type: "copy" });
  });

  it("copies with the control key too", () => {
    expect(resolveKey(key("c", { ctrl: true }), annotate)).toEqual({ type: "copy" });
  });

  it("copies with Enter", () => {
    expect(resolveKey(key("Enter"), annotate)).toEqual({ type: "copy" });
  });

  it("saves and undoes", () => {
    expect(resolveKey(key("s", { meta: true }), annotate)).toEqual({ type: "save" });
    expect(resolveKey(key("z", { meta: true }), annotate)).toEqual({ type: "undo" });
  });

  it("handles a capitalized key from Shift or CapsLock", () => {
    expect(resolveKey(key("C", { meta: true }), annotate)).toEqual({ type: "copy" });
  });

  it("does nothing for a bare c, which would swallow the page shortcut", () => {
    expect(resolveKey(key("c"), annotate)).toBeNull();
  });
});

describe("resolveKey / tools", () => {
  it("maps 1, 2 and 3", () => {
    expect(resolveKey(key("1"), annotate)).toEqual({ type: "selectTool", tool: "fill" });
    expect(resolveKey(key("2"), annotate)).toEqual({ type: "selectTool", tool: "box" });
    expect(resolveKey(key("3"), annotate)).toEqual({ type: "selectTool", tool: "arrow" });
  });

  it("ignores a number that has no tool", () => {
    expect(resolveKey(key("4"), annotate)).toBeNull();
  });
});

describe("resolveKey / scroll keys", () => {
  it("swallows the keys that would scroll the page behind", () => {
    for (const k of ["ArrowDown", "ArrowUp", "PageDown", "Home", "End", " "]) {
      expect(resolveKey(key(k), annotate)).toEqual({ type: "swallow" });
    }
  });

  it("swallows them while selecting too", () => {
    expect(resolveKey(key("ArrowDown"), selecting)).toEqual({ type: "swallow" });
  });

  it("leaves the modified ones to the browser", () => {
    expect(resolveKey(key("ArrowDown", { meta: true }), annotate)).toBeNull();
  });
});

describe("resolveKey / help", () => {
  it("toggles with ? and h", () => {
    expect(resolveKey(key("?"), annotate)).toEqual({ type: "toggleHelp" });
    expect(resolveKey(key("h"), annotate)).toEqual({ type: "toggleHelp" });
  });
});
