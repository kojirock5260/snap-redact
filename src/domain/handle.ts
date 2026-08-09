import type { Point, Rect } from "./rect";

/**
 * 選択範囲を掴むところ。四隅と四辺の中点で 8 つ。
 *
 * 名前は方位。`n` が上辺、`se` が右下隅。
 */
export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

/** 上から時計回り。描画も判定もこの順で回す。 */
export const HANDLES: readonly Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

/** ハンドルを掴める距離の上限（CSS ピクセル）。 */
const HIT = 10;

/**
 * ハンドルの当たり判定の広さ。
 *
 * 常に {@link HIT} だと、小さな範囲では全体がハンドルで埋まり、中に図形を描けなくなる。
 * 辺の 1/3 を上限にすることで、どんな大きさでも真ん中は必ず描画用に残る。
 *
 * @param r 選択範囲
 * @returns ハンドル中心からこの距離までが当たり
 */
function tolerance(r: Rect): number {
  return Math.min(HIT, r.w / 3, r.h / 3);
}

/**
 * ハンドルの中心座標。
 *
 * @param r 選択範囲
 * @param h どのハンドルか
 * @returns ハンドルの中心
 */
export function handlePoint(r: Rect, h: Handle): Point {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const right = r.x + r.w;
  const bottom = r.y + r.h;
  return {
    x: h.includes("w") ? r.x : h.includes("e") ? right : cx,
    y: h.includes("n") ? r.y : h.includes("s") ? bottom : cy,
  };
}

/**
 * 点がどのハンドルの上にあるか。
 *
 * 四隅を先に見る。隅では 2 つの辺のハンドルと範囲が重なるので、あとから見ると
 * 辺のほうが勝ってしまい、斜めに広げられなくなる。
 *
 * @param r 選択範囲
 * @param p 判定する点
 * @returns 掴んだハンドル。どれでもなければ `null`
 */
export function handleAt(r: Rect, p: Point): Handle | null {
  const t = tolerance(r);
  for (const h of HANDLES) {
    const c = handlePoint(r, h);
    if (Math.abs(p.x - c.x) <= t && Math.abs(p.y - c.y) <= t) {
      return h;
    }
  }
  return null;
}

/**
 * ハンドルを引いた結果の矩形。
 *
 * 掴んでいない辺は動かない。反対側の辺を追い越さないよう止めるので、裏返らない。
 * 裏返りを許すと、掴んでいるハンドルの意味が途中で入れ替わって操作を見失う。
 *
 * @param r 動かす前の選択範囲
 * @param h 掴んでいるハンドル
 * @param p ポインタの現在地
 * @param min 潰れないための最小の幅と高さ
 * @returns 動かしたあとの選択範囲
 */
export function resizeRect(r: Rect, h: Handle, p: Point, min: number): Rect {
  let left = r.x;
  let top = r.y;
  let right = r.x + r.w;
  let bottom = r.y + r.h;

  if (h.includes("w")) {
    left = Math.min(p.x, right - min);
  }
  if (h.includes("e")) {
    right = Math.max(p.x, left + min);
  }
  if (h.includes("n")) {
    top = Math.min(p.y, bottom - min);
  }
  if (h.includes("s")) {
    bottom = Math.max(p.y, top + min);
  }

  return { x: left, y: top, w: right - left, h: bottom - top };
}

/**
 * ハンドルに合わせた CSS のカーソル名。
 *
 * どちらに伸びるかが見て分かるので、掴む前に狙いを外しにくくなる。
 *
 * @param h 対象のハンドル
 * @returns `cursor` に入れる値
 */
export function handleCursor(h: Handle): string {
  if (h === "nw" || h === "se") {
    return "nwse-resize";
  }
  if (h === "ne" || h === "sw") {
    return "nesw-resize";
  }
  if (h === "n" || h === "s") {
    return "ns-resize";
  }
  return "ew-resize";
}
