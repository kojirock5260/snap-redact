/**
 * 失敗をツールバーアイコンに出す。
 *
 * この拡張にはポップアップもオプションページも無い。オーバーレイを開けなかった
 * ときは、そもそも出す場所が無いということでもある。残る口はアイコンだけで、
 * バッジと tooltip なら権限は増えない。
 */

/** バッジを自分で消すまでの時間（ミリ秒）。 */
const BADGE_MS = 5000;

const BADGE = "!";
const BADGE_COLOR = "#ef4444";
const TITLE = "Snap Redact";

/**
 * 失敗を消す。次に押したときに前回の `!` が残っていると紛らわしい。
 *
 * @param tabId 対象のタブ
 */
export function clearProblem(tabId: number): void {
  quiet(chrome.action.setBadgeText({ tabId, text: "" }));
  quiet(chrome.action.setTitle({ tabId, title: TITLE }));
}

/**
 * 失敗を出す。
 *
 * バッジは目印にしかならないので、理由は tooltip に入れる。
 * Service Worker が先に止まればバッジは残るが、次の起動で {@link clearProblem} が消す。
 *
 * @param tabId 対象のタブ
 * @param reason tooltip に出す理由。ユーザーが次に取れる行動まで書く
 */
export function showProblem(tabId: number, reason: string): void {
  quiet(chrome.action.setBadgeText({ tabId, text: BADGE }));
  quiet(chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR }));
  quiet(chrome.action.setTitle({ tabId, title: `${TITLE}: ${reason}` }));
  setTimeout(() => clearProblem(tabId), BADGE_MS);
}

/**
 * 拒否を握り潰す。タブが閉じられていれば失敗するが、伝えられないだけで実害は無い。
 *
 * @param p chrome.action の呼び出しが返す Promise
 */
function quiet(p: Promise<unknown>): void {
  void p.catch(() => {});
}
