import { message } from "../application/i18n";
import { COLORS, TOOLS, type ToolId } from "../domain/shape";

/** Mac かどうか。修飾キーの表記を切り替えるためだけに使う。 */
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.userAgent);

/**
 * 修飾キーの表示。Mac は ⌘、それ以外は Ctrl。
 *
 * @param key 組み合わせるキーの表記。例: `"S"`
 * @returns 画面に出す文字列。例: `"⌘S"`
 */
export const mod = (key: string): string => (IS_MAC ? `\u2318${key}` : `Ctrl+${key}`);

export interface ToolbarHandlers {
  onTool: (tool: ToolId) => void;
  onColor: (color: string) => void;
  onUndo: () => void;
  onSave: () => void;
  onCopy: () => void;
  onHelp: () => void;
}

export interface Toolbar {
  el: HTMLElement;
  /** 選択中の道具と色に印を付け直す。 */
  sync: (tool: ToolId, color: string) => void;
}

/**
 * ラベルとキー表記を並べたボタンを作る。
 *
 * @param label ボタンの文字
 * @param key 併記するキー。例: `"1"`、`"⌘S"`
 * @param onClick 押されたときに呼ぶ
 * @returns 組み立てたボタン
 */
function button(label: string, key: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "btn";
  b.type = "button";
  b.append(text("span", label), text("kbd", key));
  b.addEventListener("click", onClick);
  return b;
}

/**
 * 文字だけを持つ要素を作る。
 *
 * @param tag 作る要素のタグ名
 * @param content 入れる文字。textContent なので中身は解釈されない
 * @returns 組み立てた要素
 */
function text(tag: string, content: string): HTMLElement {
  const el = document.createElement(tag);
  el.textContent = content;
  return el;
}

/**
 * ボタンをひとまとまりにする箱を作る。
 *
 * 窓が狭いとツールバーは折り返す。まとまりを箱にしておかないと、色の並びの途中や
 * 道具の途中で行が変わり、どこまでが一組なのか読めなくなる。箱にしておけば、
 * 行が変わるのは必ず箱と箱の間になる。
 *
 * 区切りを縦罫ではなく箱の間隔で示しているのも折り返しのため。縦罫は行末や行頭に
 * 取り残されると、何も区切っていない線として残ってしまう。
 *
 * @param children 中に並べる要素
 * @returns 組み立てた箱
 */
function group(...children: Element[]): HTMLElement {
  const g = document.createElement("div");
  g.className = "grp";
  g.append(...children);
  return g;
}

/**
 * 下部のツールバーを組み立てる。並びは「道具 → 色 → 出力 → ヘルプ」で固定。
 *
 * @param h 各ボタンが押されたときに呼ぶ関数
 * @returns 要素と、選択状態を反映する `sync`
 */
export function createToolbar(h: ToolbarHandlers): Toolbar {
  const el = document.createElement("div");
  el.className = "bar";

  const tools = TOOLS.map((t) => {
    const b = button(message(t.labelKey), t.key, () => h.onTool(t.id));
    b.dataset.tool = t.id;
    return b;
  });

  const swatches = COLORS.map((c) => {
    const b = document.createElement("button");
    b.className = "sw";
    b.type = "button";
    b.dataset.color = c;
    b.style.background = c;
    b.title = c;
    b.addEventListener("click", () => h.onColor(c));
    return b;
  });

  el.append(
    group(...tools),
    group(...swatches),
    group(
      button(message("actUndo"), mod("Z"), h.onUndo),
      button(message("actSave"), mod("S"), h.onSave),
      button(message("actCopy"), mod("C"), h.onCopy),
    ),
    group(button(message("actHelp"), "?", h.onHelp)),
  );

  return {
    el,
    sync(tool, color) {
      for (const b of el.querySelectorAll<HTMLElement>(".btn[data-tool]")) {
        b.classList.toggle("on", b.dataset.tool === tool);
      }
      for (const b of el.querySelectorAll<HTMLElement>(".sw")) {
        b.classList.toggle("on", b.dataset.color === color);
      }
    },
  };
}

/**
 * ヘルプに載せる内容。`plain` はキーではなく操作の説明なので、枠を付けずに出す。
 *
 * 道具の行はツールバーのボタンから組み立てる。同じ言葉を 2 箇所に書くと、
 * 片方だけ直したときに食い違うため。
 *
 * @returns 上から順に並べる行
 */
function helpRows(): { keys: string[]; desc: string; plain?: boolean }[] {
  const tools = TOOLS.map((t) => message(t.labelKey)).join(" / ");
  return [
    { keys: [message("helpEdge")], desc: message("helpEdgeDesc"), plain: true },
    { keys: TOOLS.map((t) => t.key), desc: tools },
    { keys: [mod("Z")], desc: message("helpUndoDesc") },
    { keys: [mod("C"), "Enter"], desc: message("helpCopyDesc") },
    { keys: [mod("S")], desc: message("helpSaveDesc") },
    { keys: ["Esc"], desc: message("helpCancelDesc") },
    { keys: ["?"], desc: message("helpSelfDesc") },
  ];
}

/**
 * ヘルプパネルを組み立てる。
 *
 * ツールバーのボタンにもキーは書いてあるので、ここに載せるのは
 * ボタンを見ても分からないこと（縁を掴めること、Esc で抜けられること）が中心。
 *
 * 全体選択（⌘A）は載せていない。範囲を決めたあとに要るものではなく、決める前の
 * 案内で伝えているため（{@link createHint} を参照）。
 *
 * 「中をドラッグして描く」は載せていない。道具が並んでいる状態で範囲の中をなぞるのは
 * 自然に試せるうえ、1 行使って書くほどの発見ではないため。
 *
 * @returns ヘルプパネルの要素。`on` クラスの付け外しで見せ隠しする
 */
export function createHelp(): HTMLElement {
  const el = document.createElement("div");
  el.className = "help";

  const dl = document.createElement("dl");
  for (const row of helpRows()) {
    const dt = document.createElement("dt");
    for (const k of row.keys) {
      const kb = text(row.plain ? "span" : "kbd", k);
      if (row.plain) {
        kb.className = "plain";
      }
      dt.append(kb);
    }
    dl.append(dt, text("dd", row.desc));
  }

  el.append(text("h1", message("helpTitle")), dl);
  return el;
}

/**
 * 範囲を引く前に出す案内を組み立てる。
 *
 * 撮った直後の画面は暗くなるだけで、何を求められているのかが分からない。ドラッグ
 * すれば選べることも、窓が狭いときの逃げ道（全体選択）も、知らなければ辿り着けない。
 *
 * 載せるのはその 2 つだけ。ここはまだ何も選べていない段階なので、いま踏める道が
 * 全部でいくつあるのかが分かることに意味がある。3 つ目を足すと一覧に見えてしまい、
 * 読む対象になってしまう。ヘルプは範囲を決めたあとツールバーから辿れる。
 *
 * ツールバーと同じ場所に出す。範囲が決まるとそのまま入れ替わるので、目線を動かさずに
 * 次の操作へ移れる。
 *
 * @returns 案内の要素。`on` クラスの付け外しで見せ隠しする
 */
export function createHint(): HTMLElement {
  const el = document.createElement("div");
  el.className = "hint";

  /**
   * キーと説明を 1 組にする。キーが無い行はジェスチャの説明。
   *
   * @param key 併記するキー。ジェスチャなら `null`
   * @param label 説明の文字
   * @returns 折り返しても割れないひとまとまり
   */
  const item = (key: string | null, label: string): HTMLElement => {
    const g = document.createElement("div");
    g.className = "grp";
    if (key !== null) {
      g.append(text("kbd", key));
    }
    g.append(text("span", label));
    return g;
  };

  el.append(item(null, message("hintDrag")), item(mod("A"), message("hintAll")));
  return el;
}
