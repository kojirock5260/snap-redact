import type { Rect } from "./rect";

/**
 * ポインタの下にある要素の矩形から、クリックで使う 1 つを選ぶ。
 *
 * 端を狙ってドラッグする代わりに、要素を 1 回クリックしてその矩形をもらう。
 * 表のセルやアバター、1 行のメールアドレスは、縁をなぞるよりこのほうが速い。
 *
 * 要素の列挙は DOM の仕事なので application が行い、ここは「どれを使うか」だけを
 * 決める。手前から順に見て、最初に使えるものを返す。
 *
 * - 撮った絵の外にはみ出したぶんは切り落とす。見えていない部分は写っていない
 * - 切り落とした結果が小さすぎるものは飛ばす。アイコンの角や、ほとんど画面外の
 *   要素をクリックしたとき、次に大きい要素（たいてい親）に落ちる
 * - 撮った絵の全体を覆うものも飛ばす。全体選択はキーに割り当ててあるので、
 *   何もないところのクリックで全体が選ばれると、押し間違いと区別が付かない。
 *   モーダルの背景幕のように手前に全画面の要素があっても、その下の要素へ落ちる
 *
 * 座標は外側へ丸める。隠す用途で使うとき、内側へ丸めると文字の縁が
 * 1 物理ピクセルぶん残ることがある。
 *
 * @param rects ポインタの下にある要素の矩形。手前から順に並べる
 * @param frame 撮った絵の大きさ
 * @param min これ未満の幅か高さになる候補は飛ばす
 * @returns 使う矩形。無ければ `null`
 */
export function pickRect(
  rects: readonly Rect[],
  frame: { w: number; h: number },
  min: number,
): Rect | null {
  for (const raw of rects) {
    const left = Math.max(0, Math.floor(raw.x));
    const top = Math.max(0, Math.floor(raw.y));
    const right = Math.min(frame.w, Math.ceil(raw.x + raw.w));
    const bottom = Math.min(frame.h, Math.ceil(raw.y + raw.h));
    const w = right - left;
    const h = bottom - top;
    if (w < min || h < min) {
      continue;
    }
    if (w >= frame.w && h >= frame.h) {
      continue;
    }
    return { x: left, y: top, w, h };
  }
  return null;
}
