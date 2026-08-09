import { startCapture } from "./application/capture";
import { message } from "./application/i18n";

/**
 * Service Worker。起動の入口を 2 つ用意して、あとは application に渡すだけ。
 *
 * キーボードショートカットの既定値は持たない。Cmd+Shift+X のような押しやすい
 * 組み合わせは 1Password などと衝突するので、こちらから決め打ちしない。
 * 必要な人は chrome://extensions/shortcuts で好きなキーを割り当てられる。
 */

const MENU_ID = "snap-redact-start";

chrome.runtime.onInstalled.addListener(() => {
  // 更新のたびに作り直す。同じ id で create すると重複エラーになるため。
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: message("menuStart"),
      contexts: ["page", "selection", "image", "link", "video", "audio", "editable"],
    });
  });
});

/**
 * Service Worker を起こしてから、この操作が届くまでの経過を出す。
 *
 * `performance.now()` は Service Worker の起動を 0 とするので、この値がそのまま
 * 「起きてから何ミリ秒経ったか」になる。小さければ、この操作のために起こし直した
 * ということ。MV3 は放置すると 30 秒ほどで停止するので、久しぶりの起動では必ず起きる。
 *
 * @param entry どちらの入口から来たか
 */
function logWake(entry: string): void {
  console.debug(`[Snap Redact] ${entry} wake ${Math.round(performance.now())}ms`);
}

chrome.action.onClicked.addListener((tab) => {
  logWake("action");
  void startCapture(tab);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && tab) {
    logWake("menu");
    void startCapture(tab);
  }
});
