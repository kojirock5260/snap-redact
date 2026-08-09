/**
 * 書き込みの結果。
 *
 * `insecure` は http: ページで拒否された場合。Clipboard API は secure context
 * でしか使えず、コンテンツスクリプトはページ側の文脈で判定される。
 * この場合は保存に誘導するしかないので、ほかの失敗と分けて返す。
 */
export type CopyOutcome = { ok: true } | { ok: false; reason: "insecure" | "denied" };

/**
 * PNG をクリップボードへ書き込む。
 *
 * `clipboardWrite` 権限は取っていない。あれを付けると「コピー＆ペーストする
 * データの変更」という警告がインストール時に出てしまい、この拡張の売りである
 * 「警告ゼロ」が崩れる。代わりにキー操作を起点に呼ぶことで、権限なしでも通る。
 *
 * 例外は投げない。呼び出し側が try/catch を書かなくて済むようにしてある。
 *
 * @param blob 書き込む PNG
 * @returns 成功したか、失敗ならその理由
 */
export async function copyPng(blob: Blob): Promise<CopyOutcome> {
  if (!window.isSecureContext) {
    return { ok: false, reason: "insecure" };
  }
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return { ok: true };
  } catch {
    return { ok: false, reason: "denied" };
  }
}
