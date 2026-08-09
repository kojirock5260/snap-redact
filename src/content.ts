import type { Message } from "./domain/protocol";
import { mountOverlay, unmountOverlay } from "./presentation/overlay";

/**
 * ページに注入されるスクリプト。
 *
 * executeScript は起動のたびに走るので、2 回目以降は何もしないようにしている。
 * ここで抜けても onMessage の購読は 1 回目のものが生きているため、
 * Service Worker から送られる `start` はちゃんと届く。
 */

const FLAG = "__snapRedactLoaded__";

declare global {
  interface Window {
    [FLAG]?: true;
  }
}

if (!window[FLAG]) {
  window[FLAG] = true;

  chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
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
  });
}
