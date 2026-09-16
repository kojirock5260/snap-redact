import type { Point, Rect } from "../domain/rect";

/**
 * ポインタの下にあるページ側の要素の矩形を、手前から順に列挙する。
 *
 * オーバーレイはページの上に被さっているので、普通の当たり判定ではオーバーレイ
 * 自身しか取れない。`elementsFromPoint` はその点にある要素を奥まで全部返すので、
 * 自分を除けば残りがページの要素になる。Shadow DOM の中身は返らず、ホストが
 * 1 つ返るだけなので、除くのはホストで足りる。
 *
 * `html` と `body` も除く。中身の入れ物であって、撮りたい「もの」ではない。
 * 短いページで `body` が画面の上半分にしか無いとき、その下の余白を押して
 * `body` の矩形が選ばれても、押した本人には理由が分からない。
 *
 * 撮ったあとにページが動いていなければ、矩形は撮った絵と一致する。ホイールと
 * スクロールキーを止めているのはこのためでもある。
 *
 * @param p ビューポート基準の座標
 * @param host 除外するオーバーレイのホスト要素
 * @returns 手前から順に並べた矩形。CSS ピクセル、ビューポート基準
 */
export function rectsUnder(p: Point, host: Element): Rect[] {
  return document
    .elementsFromPoint(p.x, p.y)
    .filter((el) => el !== host && el !== document.documentElement && el !== document.body)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
}
