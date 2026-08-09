import { describe, expect, it } from "vitest";

/**
 * 対訳の抜けは実行するまで気づけない。
 *
 * `chrome.i18n.getMessage` は見つからないキーに空文字を返すので、片方の言語だけ
 * ボタンの文字が消える。ここで機械的に突き合わせておく。
 *
 * ファイルは `import.meta.glob` で読む。`node:fs` を使うと tsconfig の `types` に
 * node を足すことになり、拡張の本体には要らない依存が増えるため。
 */

type Entry = { message: string; placeholders?: Record<string, unknown> };
type Messages = Record<string, Entry>;

const rawLocales = import.meta.glob("../public/_locales/*/messages.json", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const rawSources = import.meta.glob("../src/**/*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** パスから言語名だけ取り出した対訳表。 */
const locales = new Map<string, Messages>(
  Object.entries(rawLocales).map(([path, text]) => {
    const parts = path.split("/");
    return [parts[parts.length - 2] ?? path, JSON.parse(text) as Messages];
  }),
);

const en = locales.get("en") ?? {};
const ja = locales.get("ja") ?? {};

describe("locales", () => {
  it("ships the two languages the manifest promises", () => {
    expect([...locales.keys()].sort()).toEqual(["en", "ja"]);
  });

  it("has the same keys in every language", () => {
    expect(Object.keys(ja).sort()).toEqual(Object.keys(en).sort());
  });

  it("leaves no message empty", () => {
    for (const [name, messages] of locales) {
      for (const [key, entry] of Object.entries(messages)) {
        expect(entry.message.length, `${name}/${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("declares the same placeholders on both sides", () => {
    for (const key of Object.keys(en)) {
      expect(Object.keys(ja[key]?.placeholders ?? {}), key).toEqual(
        Object.keys(en[key].placeholders ?? {}),
      );
    }
  });
});

describe("keys used in src", () => {
  const used = new Set<string>();
  for (const text of Object.values(rawSources)) {
    for (const m of text.matchAll(/\bmessage\("([A-Za-z0-9_]+)"/g)) {
      used.add(m[1]);
    }
    // TOOLS が持つ labelKey は message() を通さずに書かれている。
    for (const m of text.matchAll(/labelKey: "([A-Za-z0-9_]+)"/g)) {
      used.add(m[1]);
    }
  }

  it("finds the keys at all, so this test cannot pass by looking at nothing", () => {
    expect(used.size).toBeGreaterThan(10);
  });

  it("has every used key translated", () => {
    for (const key of [...used].sort()) {
      expect(en, `en is missing ${key}`).toHaveProperty(key);
      expect(ja, `ja is missing ${key}`).toHaveProperty(key);
    }
  });
});
