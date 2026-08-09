/**
 * PNG をダウンロードさせる。
 *
 * `downloads` 権限は使わない。「ダウンロードを管理」という警告が出るうえ、
 * a 要素のクリックで同じことができるため、取る理由がない。
 *
 * 保存先はブラウザの設定に従う。拡張からは指定しない。
 *
 * @param dataUrl 保存する画像の data URL
 * @param fileName 保存時のファイル名
 */
export function savePng(dataUrl: string, fileName: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  a.click();
}
