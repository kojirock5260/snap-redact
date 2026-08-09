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
  | { type: "selectTool"; tool: ToolId }
  /** 何もしないが、ページにも渡さない。 */
  | { type: "swallow" };

/** KeyboardEvent から必要な分だけ抜き出したもの。DOM に依存させないための型。 */
export interface KeyInput {
  key: string;
  meta: boolean;
  ctrl: boolean;
}

export interface KeyContext {
  phase: "select" | "annotate";
  helpOpen: boolean;
  /** 範囲か図形を引いている最中か。 */
  drawing: boolean;
}

/**
 * 押されても行き先が無いが、ページに渡してもいけないキー。
 *
 * 裏のページがスクロールしても、貼り付けてある絵は動かない。画面上は何も起きて
 * いないように見えるのに、閉じた瞬間だけ位置が飛ぶ。ホイールを止めているのと
 * 同じ理由で、キーによるスクロールも飲み込む。
 */
const SCROLL_KEYS = new Set([
  " ",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "PageUp",
  "PageDown",
  "Home",
  "End",
]);

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

  // 範囲を決める前は、ドラッグ以外に選べるものが無い。
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
