import type { Message } from "./domain/protocol";
import { mountOverlay, unmountOverlay } from "./presentation/overlay";

/**
 * ページに注入されるスクリプト。
 *
 * 同じページへ 2 回注入されても購読が二重にならないよう、貼った listener を
 * window に控えておき、次に注入されたときは外してから貼り直す。
 *
 * 真偽値の印で「もう入れた」と判断してはいけない。拡張を読み込み直すと古い
 * listener は死ぬが、window に付けた印はページに残る。印だけを見ると、死んだ
 * 購読を生きていると誤解して登録せずに終わり、以後そのタブでは何も起きなくなる。
 * 更新のたびに開いていたタブが全滅するので、印ではなく実体を持っておく。
 */

const KEY = "__snapRedact__";

type Listener = (
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: { ok: boolean }) => void,
) => boolean;

declare global {
  interface Window {
    [KEY]?: Listener;
  }
}

const handle: Listener = (message, _sender, sendResponse) => {
  if (message.type === "start") {
    // Service Worker 側の計測は受け渡しと復号を分けられないので、こちらでも測る。
    // 差し引けば、どちらに時間が寄っているかが分かる。
    const started = performance.now();
    // 画像の読み込みを待つので非同期。true を返して応答の口を開けておく。
    void mountOverlay(message.dataUrl).then(
      () => {
        console.debug(`[Snap Redact] mount ${Math.round(performance.now() - started)}ms`);
        sendResponse({ ok: true });
      },
      // 失敗しても必ず返す。黙って落ちると、送った側は理由を出せない。
      (e) => {
        console.error("[Snap Redact]", e);
        sendResponse({ ok: false });
      },
    );
    return true;
  }
  if (message.type === "abort") {
    unmountOverlay();
    sendResponse({ ok: true });
  }
  return false;
};

// 死んだコンテキストのものは外れないが、そもそも購読が消えているので実害はない。
const previous = window[KEY];
if (previous) {
  chrome.runtime.onMessage.removeListener(previous);
}
window[KEY] = handle;
chrome.runtime.onMessage.addListener(handle);
