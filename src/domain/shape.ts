import { type Drag, diagonal, type Point, toRect } from "./rect";

/** 使える道具は 3 つだけ。増やすと選ぶ手間が増えるので、ここは意図的に固定。 */
export type ToolId = "fill" | "box" | "arrow";

export interface Tool {
  id: ToolId;
  /** キーボードから直接選ぶためのキー。表示にもそのまま使う。 */
  key: string;
  /**
   * 表示名の対訳キー。
   *
   * 文字そのものを持たないのは、domain がブラウザ API を触らないため。
   * 引くのは presentation の仕事で、ここは「どれを引くか」だけを持つ。
   */
  labelKey: string;
}

export const TOOLS: readonly Tool[] = [
  { id: "fill", key: "1", labelKey: "toolFill" },
  { id: "box", key: "2", labelKey: "toolBox" },
  { id: "arrow", key: "3", labelKey: "toolArrow" },
];

/** 囲いと矢印で選べる色。塗り潰しには使わない（{@link REDACT_COLOR} を参照）。 */
export const COLORS: readonly string[] = ["#ef4444", "#2563eb", "#16a34a", "#f59e0b", "#0f172a"];

/**
 * 塗り潰しの色。ユーザーには変えさせない。
 *
 * 隠す目的で使うものなので、モザイクやぼかしのような「元が透けるかもしれない手段」も、
 * 背景に溶ける薄い色も選ばせたくない。不透明な単色で塗り切るのが唯一安全な消し方。
 */
export const REDACT_COLOR = "#12161c";

/** 描かれた 1 つの図形。座標は選択範囲ではなくビューポート基準。 */
export interface Shape extends Drag {
  tool: ToolId;
  color: string;
}

/** これ未満のドラッグは選択とみなさない。クリックの取りこぼしを図形にしないための下限。 */
export const MIN_SELECTION = 8;

/**
 * 図形として残す価値があるか。
 *
 * 矢印だけ判定を変えている。真横や真下に引いた矢印は幅か高さが 0 に近くなるので、
 * 矩形と同じ「幅も高さも一定以上」で見ると弾かれてしまう。長さで見る必要がある。
 *
 * @param s 引き終わった図形
 * @returns 残す価値があれば `true`。取りこぼしのクリックなら `false`
 */
export function isDrawable(s: Shape): boolean {
  if (s.tool === "arrow") {
    return diagonal(s) >= 10;
  }
  const r = toRect(s);
  return r.w >= 4 && r.h >= 4;
}

/** 矢印を描くのに必要な 4 点。線は始点から {@link ArrowGeometry.base} まで引く。 */
export interface ArrowGeometry {
  /** 線の終端。穂先の内側に少し引っ込めてあるので、線の端が穂先からはみ出さない。 */
  base: Point;
  tip: Point;
  left: Point;
  right: Point;
}

/** 穂先の開き角（ラジアン）。片側ぶん。 */
const BARB_ANGLE = 0.42;

/**
 * 矢印の穂先の座標を求める。
 *
 * 描画そのものは presentation の仕事だが、座標の計算は canvas に依存しないので
 * ここに置いてテストできるようにしてある。
 *
 * @param s 始点と終点を持つ図形
 * @param head 穂先の長さ（CSS ピクセル）
 * @returns 線の終端と穂先の 3 点
 */
export function arrowGeometry(s: Drag, head: number): ArrowGeometry {
  const angle = Math.atan2(s.y1 - s.y0, s.x1 - s.x0);
  return {
    // 0.85 は穂先と線の重なり分。線が穂先の中ほどまで届くので継ぎ目が見えない。
    base: { x: s.x1 - Math.cos(angle) * head * 0.85, y: s.y1 - Math.sin(angle) * head * 0.85 },
    tip: { x: s.x1, y: s.y1 },
    left: {
      x: s.x1 - Math.cos(angle - BARB_ANGLE) * head,
      y: s.y1 - Math.sin(angle - BARB_ANGLE) * head,
    },
    right: {
      x: s.x1 - Math.cos(angle + BARB_ANGLE) * head,
      y: s.y1 - Math.sin(angle + BARB_ANGLE) * head,
    },
  };
}
