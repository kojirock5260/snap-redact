import { describe, expect, it } from "vitest";
import { isCapturable } from "../../src/domain/target";

describe("isCapturable", () => {
  it("accepts ordinary pages", () => {
    expect(isCapturable("https://github.com/pull/1")).toBe(true);
    expect(isCapturable("http://localhost:3000/")).toBe(true);
    expect(isCapturable("file:///Users/me/report.html")).toBe(true);
  });

  it("rejects privileged pages that cannot be injected into", () => {
    expect(isCapturable("chrome://extensions")).toBe(false);
    expect(isCapturable("devtools://devtools/bundled/inspector.html")).toBe(false);
    expect(isCapturable("view-source:https://example.com")).toBe(false);
    expect(isCapturable("chrome-extension://abc/page.html")).toBe(false);
  });

  it("rejects the web store, where the browser forbids injection", () => {
    expect(isCapturable("https://chromewebstore.google.com/detail/abc")).toBe(false);
    expect(isCapturable("https://chromewebstore.google.com")).toBe(false);
    expect(isCapturable("https://chrome.google.com/webstore/category/extensions")).toBe(false);
  });

  it("accepts the rest of chrome.google.com", () => {
    expect(isCapturable("https://chrome.google.com/")).toBe(true);
  });

  it("is not fooled by a lookalike host", () => {
    expect(isCapturable("https://chromewebstore.google.com.example.com/")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(isCapturable("CHROME://settings")).toBe(false);
  });

  it("rejects a tab with no url yet", () => {
    expect(isCapturable(undefined)).toBe(false);
    expect(isCapturable("")).toBe(false);
  });
});
