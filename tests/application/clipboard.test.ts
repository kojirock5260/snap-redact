import { afterEach, describe, expect, it, vi } from "vitest";
import { copyPng } from "../../src/application/clipboard";

/** copyPng は window と navigator しか触らないので、その 2 つだけ差し替える。 */
function setup(opts: { secure: boolean; write?: () => Promise<void> }) {
  vi.stubGlobal("window", { isSecureContext: opts.secure });
  vi.stubGlobal("navigator", { clipboard: { write: opts.write ?? (async () => {}) } });
  vi.stubGlobal(
    "ClipboardItem",
    class {
      constructor(public items: Record<string, Blob>) {}
    },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const png = new Blob(["x"], { type: "image/png" });

describe("copyPng", () => {
  it("succeeds on a secure page", async () => {
    setup({ secure: true });
    expect(await copyPng(png)).toEqual({ ok: true });
  });

  it("reports insecure without even calling the clipboard on an http page", async () => {
    const write = vi.fn(async () => {});
    setup({ secure: false, write });
    expect(await copyPng(png)).toEqual({ ok: false, reason: "insecure" });
    expect(write).not.toHaveBeenCalled();
  });

  it("reports denied when the browser refuses", async () => {
    setup({
      secure: true,
      write: async () => {
        throw new Error("Document is not focused");
      },
    });
    expect(await copyPng(png)).toEqual({ ok: false, reason: "denied" });
  });

  it("never throws, so the caller needs no try/catch", async () => {
    setup({
      secure: true,
      write: async () => {
        throw new Error("boom");
      },
    });
    await expect(copyPng(png)).resolves.toBeDefined();
  });
});
