import { TOOLS, type ToolId } from "./shape";

/** オーバーレイが受け付ける操作。キー入力の解釈結果はすべてこの形になる。 */
export type Action =
  | { type: "cancel" }
  | { type: "closeHelp" }
  | { type: "toggleHelp" }
  | { type: "copy" }
  | { type: "save" }
  | { type: "undo" }
  /** 引いている最中のものだけ取り消す。オーバーレイは閉じない。 */
  | { type: "cancelDrag" }
  /** 撮った絵の全体を選択範囲にする。 */
  | { type: "selectAll" }
  /** 選択範囲を平行移動する。単位は CSS ピクセル。 */
  | { type: "nudge"; dx: number; dy: number }
  | { type: "selectTool"; tool: ToolId }
  /** 何もしないが、ページにも渡さない。 */
  | { type: "swallow" };

/** KeyboardEvent から必要な分だけ抜き出したもの。DOM に依存させないための型。 */
export interface KeyInput {
  key: string;
  meta: boolean;
  ctrl: boolean;
  shift: boolean;
}

export interface KeyContext {
  phase: "select" | "annotate";
  helpOpen: boolean;
  /** 範囲か図形を引いている最中か。 */
  drawing: boolean;
}

/** 矢印キー 1 回で選択範囲が動く距離（CSS ピクセル）。 */
export const NUDGE = 1;

/** Shift を押しながらのとき。1 ピクセルずつでは遠くまで運べない。 */
export const NUDGE_FAST = 10;

/** 矢印キーと、それが指す向き。 */
const ARROWS: ReadonlyMap<string, { dx: number; dy: number }> = new Map([
  ["ArrowUp", { dx: 0, dy: -1 }],
  ["ArrowDown", { dx: 0, dy: 1 }],
  ["ArrowLeft", { dx: -1, dy: 0 }],
  ["ArrowRight", { dx: 1, dy: 0 }],
]);

/**
 * 押されても行き先が無いが、ページに渡してもいけないキー。
 *
 * 裏のページがスクロールしても、貼り付けてある絵は動かない。画面上は何も起きて
 * いないように見えるのに、閉じた瞬間だけ位置が飛ぶ。ホイールを止めているのと
 * 同じ理由で、キーによるスクロールも飲み込む。
 *
 * 矢印キーもページをスクロールさせるが、選択範囲を動かす役があるので別に持つ。
 */
const SCROLL_KEYS = new Set([" ", "PageUp", "PageDown", "Home", "End"]);

/**
 * キー入力を操作に変換する。何もしないなら `null`。
 *
 * DOM を触らない純粋関数にしてあるのは、ここがいちばん壊れやすく、いちばん
 * テストしやすい部分だから。「Esc がヘルプを閉じるだけで終わってしまい、
 * 中止できない」といった取り違えは、実機で気づくと直しにくい。
 *
 * Cmd と Ctrl を区別していないのは、Mac と Windows で同じキーを使わせるため。
 *
 * @param e 押されたキー
 * @param ctx 押された時点のオーバーレイの状況
 * @returns 実行する操作。割り当てが無ければ `null`
 */
export function resolveKey(e: KeyInput, ctx: KeyContext): Action | null {
  // Esc はどの段階でも効くが、一段ずつ戻る。いきなり全部消すと、直したいのは
  // 引きかけの 1 本だけなのに撮り直しになる。
  if (e.key === "Escape") {
    if (ctx.helpOpen) {
      return { type: "closeHelp" };
    }
    if (ctx.drawing) {
      return { type: "cancelDrag" };
    }
    return { type: "cancel" };
  }

  // 修飾キー付きの矢印などはブラウザ側の操作なので、飲み込まずに通す。
  const mod = e.meta || e.ctrl;
  if (!mod && SCROLL_KEYS.has(e.key)) {
    return { type: "swallow" };
  }

  // 矢印キーは選択範囲を動かす。効くのは範囲を決めたあと、何も引いていないとき
  // だけ。引いている最中に動くと、ポインタとの対応が崩れる。
  //
  // 効かない段階でも飲み込む。ページに渡すと裏でスクロールが起きる。
  const arrow = mod ? undefined : ARROWS.get(e.key);
  if (arrow) {
    if (ctx.phase !== "annotate" || ctx.drawing) {
      return { type: "swallow" };
    }
    const step = e.shift ? NUDGE_FAST : NUDGE;
    return { type: "nudge", dx: arrow.dx * step, dy: arrow.dy * step };
  }

  // 全体選択は範囲を引く前だけ。狭い窓では端ちょうどから引くのが難しいうえ、
  // オーバーレイはビューポートの外に出られないので、ポインタを窓の外へ逃がしてから
  // 引き始めることもできない。ここが唯一の逃げ道になる。
  //
  // 決めたあとは効かせない。描いている最中に押し間違えると、範囲が全体に戻って
  // 選び直しになる。⌘Z は図形しか戻さないので、取り返す手がない。
  //
  // 効かない段階でもページには渡さない。裏のページで全選択が起きると、画面上は
  // 何も変わらないのに、閉じた瞬間だけ文字が反転して見える。
  if (mod && e.key.toLowerCase() === "a") {
    return ctx.phase === "select" ? { type: "selectAll" } : { type: "swallow" };
  }

  // 範囲を決める前は、ドラッグと全体選択のほかに選べるものが無い。案内は画面に出して
  // あるので、ヘルプを開かせる必要もない。
  if (ctx.phase !== "annotate") {
    return null;
  }

  if (e.key === "?" || e.key === "h" || e.key === "H") {
    return { type: "toggleHelp" };
  }

  if (mod) {
    switch (e.key.toLowerCase()) {
      case "c":
        return { type: "copy" };
      case "s":
        return { type: "save" };
      case "z":
        return { type: "undo" };
      default:
        return null;
    }
  }

  // 貼り先がクリップボードである以上、Enter は「コピーして終わり」が自然。
  if (e.key === "Enter") {
    return { type: "copy" };
  }

  const tool = TOOLS.find((t) => t.key === e.key);
  return tool ? { type: "selectTool", tool: tool.id } : null;
}
