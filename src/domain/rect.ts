/** 画面上の 1 点。単位は CSS ピクセル。 */
export interface Point {
  x: number;
  y: number;
}

/** 左上と幅高さで表した矩形。幅高さは常に 0 以上。 */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * ドラッグの始点と終点。
 *
 * 右下方向にしか引かない前提を置いていないので、`x1 < x0` も `y1 < y0` もありうる。
 * 矩形として扱いたくなったら {@link toRect} を通す。
 */
export interface Drag {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * ドラッグを正規化して矩形にする。
 *
 * どの方向に引いても同じ矩形になるので、呼び出し側で始点と終点の大小を
 * 気にしなくてよくなる。
 *
 * @param d 正規化したいドラッグ
 * @returns 左上と幅高さで表した矩形。幅高さは 0 以上
 */
export function toRect(d: Drag): Rect {
  return {
    x: Math.min(d.x0, d.x1),
    y: Math.min(d.y0, d.y1),
    w: Math.abs(d.x1 - d.x0),
    h: Math.abs(d.y1 - d.y0),
  };
}

/**
 * 点が矩形の内側（辺の上を含む）にあるか。
 *
 * 辺上を内側として扱うのは、選択範囲のちょうど端から図形を描き始めたいことが
 * あるため。1 ピクセル分の厳密さより、狙ったところから引けるほうを優先している。
 *
 * @param r 判定する矩形
 * @param p 判定する点
 * @returns 内側または辺の上なら `true`
 */
export function contains(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

/**
 * 点を枠の中に押し戻す。
 *
 * ポインタキャプチャ中の座標は窓の外にも出る。そのまま選択範囲にすると、撮った絵の
 * 無いところまで範囲に入り、書き出した PNG に空白の帯が付く。入口で潰しておく。
 *
 * @param p 押し戻す点
 * @param w 枠の幅
 * @param h 枠の高さ
 * @returns 0 以上 `w` / `h` 以下に収めた点
 */
export function clampPoint(p: Point, w: number, h: number): Point {
  return {
    x: Math.min(Math.max(p.x, 0), w),
    y: Math.min(Math.max(p.y, 0), h),
  };
}

/**
 * ドラッグの始点から終点までの直線距離。
 *
 * @param d 測るドラッグ
 * @returns CSS ピクセルでの距離
 */
export function diagonal(d: Drag): number {
  return Math.hypot(d.x1 - d.x0, d.y1 - d.y0);
}
