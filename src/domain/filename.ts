/** 保存する PNG の接頭辞。連番ではなく時刻にしているので、既存ファイルを上書きしない。 */
const PREFIX = "snap";

/**
 * 数値を 2 桁に揃える。
 *
 * @param n 0 以上 99 以下を想定した数値
 * @returns 1 桁なら先頭に 0 を足した文字列
 */
const pad = (n: number): string => String(n).padStart(2, "0");

/**
 * 保存用のファイル名を作る。例: `snap-20260809-214955.png`
 *
 * UTC ではなくローカル時刻を使う。作った本人が「さっきの」を探すためのものなので、
 * 手元の時計と一致していないと役に立たない。
 *
 * @param at 保存した時刻。ローカル時刻として読む
 * @returns `snap-YYYYMMDD-HHmmss.png` 形式のファイル名
 */
export function snapFileName(at: Date): string {
  const date = `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}`;
  const time = `${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`;
  return `${PREFIX}-${date}-${time}.png`;
}
