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
 * 端に吸い付く距離（CSS ピクセル）。
 *
 * オーバーレイはページのビューポートの中にしか置けない。ポインタを窓の外へ逃がして
 * から引き始めることができないので、端ちょうどを取るには最外周の 1 ピクセルを狙う
 * ことになる。DevTools のデバイスモードのように窓が狭いと、その 1 ピクセルは隣の
 * UI と接していて、狙いを外した瞬間に触るのは拡張ではなく DevTools のほうになる。
 *
 * 端に寄せたら端として扱えば、その精度を要求せずに済む。窓の外から引けないことの
 * 埋め合わせなので、値は「狙わなくても入る」幅であれば足りる。
 */
export const EDGE_SNAP = 12;

/**
 * 点を枠の中に押し戻し、端の近くなら端そのものへ寄せる。
 *
 * 押し戻すほうは必須。ポインタキャプチャ中の座標は窓の外にも出る。そのまま選択範囲に
 * すると、撮った絵の無いところまで範囲に入り、書き出した PNG に空白の帯が付く。
 *
 * @param p 押し戻す点
 * @param w 枠の幅
 * @param h 枠の高さ
 * @param snap 端に寄せる距離。0 を渡せば押し戻すだけになる
 * @returns 0 以上 `w` / `h` 以下に収め、端の近くなら端に寄せた点
 */
export function snapPoint(p: Point, w: number, h: number, snap: number): Point {
  return {
    x: snapAxis(p.x, w, snap),
    y: snapAxis(p.y, h, snap),
  };
}

/**
 * 1 軸ぶんの押し戻しと寄せ。
 *
 * 寄せる幅を枠の 1/4 で頭打ちにしている。上限が無いと、枠が吸着幅の 2 倍を切った
 * ところで全域がどちらかの端に吸われ、真ん中を指せなくなる。ハンドルの当たり判定を
 * 辺の 1/3 で頭打ちにしているのと同じ理由。
 *
 * @param v 押し戻す座標
 * @param max 枠の大きさ
 * @param snap 端に寄せる距離
 * @returns 0 以上 `max` 以下の座標
 */
function snapAxis(v: number, max: number, snap: number): number {
  const t = Math.min(snap, max / 4);
  if (v <= t) {
    return 0;
  }
  if (v >= max - t) {
    return max;
  }
  return v;
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
