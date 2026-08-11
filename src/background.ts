import { startCapture } from "./application/capture";
import { message } from "./application/i18n";

/**
 * Service Worker。起動の入口を 3 つ用意して、あとは application に渡すだけ。
 *
 * ショートカットは他の 2 つの代わりではなく、他の 2 つでは撮れないものを撮るための
 * 入口。マウスを載せている間だけ出る要素は、アイコンや右クリックへポインタを
 * 動かした時点で消えてしまう。キーで起こすなら、ポインタは載せたままでいられる。
 *
 * 既定を Ctrl/Cmd+Shift+E にしたのは、Chrome が Ctrl/Cmd+Shift に割り当てている
 * のが B/D/G/H/I/J/M/N/O/R/T/W と Delete だけで、E が空いているため。
 * Cmd+Shift+X のような押しやすい組み合わせは 1Password などと衝突する。
 * 左手だけで押せる位置なのも理由のひとつで、右手はポインタを載せたまま押せる。
 * 合わなければ chrome://extensions/shortcuts で変えられる。
 */

const MENU_ID = "snap-redact-start";

/** manifest の `commands` に書いてある名前。ここと一致しないと起動しない。 */
const COMMAND_ID = "start-capture";

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

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== COMMAND_ID) {
    return;
  }
  logWake("command");
  void startFromShortcut(tab);
});

/**
 * ショートカットで起動する。
 *
 * activeTab はショートカットでも付く。アイコンや右クリックと同じ扱いなので、
 * 渡す先は変わらない。
 *
 * 渡されるタブを当てにしきらないのは、この引数が省略可能だから。取れなかった
 * ときに黙って終わると、押しても何も起きないキーになってしまう。url が無い
 * タブは {@link startCapture} が「使えないページ」として弾くので、無い場合も
 * 引き直す。
 *
 * @param tab onCommand が渡してきたタブ。渡されないことがある
 * @returns 起動を終えると解決する Promise
 */
async function startFromShortcut(tab: chrome.tabs.Tab | undefined): Promise<void> {
  if (tab?.url) {
    await startCapture(tab);
    return;
  }
  const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (active) {
    await startCapture(active);
  }
}
