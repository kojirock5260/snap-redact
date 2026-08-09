import type { Message } from "../domain/protocol";
import { isCapturable } from "../domain/target";
import { message } from "./i18n";
import { clearProblem, showProblem } from "./notify";

/** オーバーレイを閉じてから撮り直すまでの待ち時間（ミリ秒）。 */
const REPAINT_MS = 40;

/**
 * 指定した時間だけ待つ。
 *
 * @param ms 待つ時間（ミリ秒）
 * @returns 時間が経つと解決する Promise
 */
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * 段階ごとの所要時間を測る。
 *
 * 起動が遅いと感じたとき、どこで時間を使っているかは推測では分からない。
 * `console.debug` なので DevTools の Verbose を有効にしない限り表示されず、
 * 普段の邪魔にはならない。
 *
 * @returns 段階名を渡すと、前の段階からの経過を出す関数
 */
function stopwatch(): (stage: string, bytes?: number) => void {
  const start = performance.now();
  let last = start;
  return (stage, bytes) => {
    const now = performance.now();
    const size = bytes === undefined ? "" : ` / ${Math.round(bytes / 1024)}KB`;
    console.debug(
      `[Snap Redact] ${stage} ${Math.round(now - last)}ms (累計 ${Math.round(now - start)}ms)${size}`,
    );
    last = now;
  };
}

/**
 * 表示領域を撮って、そのタブにオーバーレイを開かせる。
 *
 * 撮る前に必ず `abort` を投げているのがこの関数の要点。連続で起動したとき、
 * 前回のオーバーレイが画面に残ったまま撮ると、暗転した画像がそのまま次の
 * キャプチャに写り込む。閉じたあと再描画を待つ必要があるので、少しだけ寝かせる。
 *
 * activeTab はアイコンのクリックか右クリックメニューで付与される。
 * どちらの入口から来ても、この関数を呼ぶ時点では権限が付いている。
 *
 * 失敗しても投げ返さない。ページ側は壊れないが、黙って終わると押し間違いと
 * 区別が付かないので、理由はアイコンに出す。
 *
 * @param tab 起動元のタブ。id が無ければ何もしない
 * @returns オーバーレイを開かせるか、理由を出し終えると解決する Promise
 */
export async function startCapture(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id) {
    return;
  }
  const tabId = tab.id;
  clearProblem(tabId);

  if (!isCapturable(tab.url)) {
    showProblem(tabId, message("errUnsupported"));
    return;
  }

  const mark = stopwatch();
  try {
    // 返事があれば、前回注入したスクリプトがまだ生きているということ。
    // 開きっぱなしのオーバーレイもこれで閉じるので、撮る前に必ず投げる。
    const alive = await send(tabId, { type: "abort" });
    if (alive) {
      await sleep(REPAINT_MS);
    }
    mark("abort");

    // 撮影と注入は互いを待つ必要がない。content.js は画像を受け取るまで何も描かないので、
    // 注入が先に終わっても写り込まない。
    // 生きているなら注入し直さない。同じファイルを読ませ直すだけ無駄になる。
    const [dataUrl] = await Promise.all([
      chrome.tabs.captureVisibleTab({ format: "png" }),
      alive ? null : chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] }),
    ]);
    mark("capture", dataUrl.length);

    const reply: { ok: boolean } | undefined = await chrome.tabs.sendMessage(tabId, {
      type: "start",
      dataUrl,
    } satisfies Message);
    // 画像の受け渡しと、ページ側での復号とオーバーレイ組み立てまで含む。
    mark("open");

    // 注入までは通ったのにオーバーレイが開かなかった場合。画像を読めていない。
    if (!reply?.ok) {
      showProblem(tabId, message("errImage"));
    }
  } catch (e) {
    console.error("[Snap Redact]", e);
    showProblem(tabId, reasonOf(tab.url));
  }
}

/**
 * 例外から伝えられることは多くないので、URL から言えるぶんだけ足す。
 *
 * `file:` は「ファイルの URL へのアクセスを許可」を入れないと注入できない。
 * 拡張の詳細画面にある設定なので、そこまで案内しないと直しようがない。
 *
 * @param url 失敗したタブの URL
 * @returns tooltip に出す理由
 */
function reasonOf(url: string | undefined): string {
  if (url?.startsWith("file:")) {
    return message("errFileAccess");
  }
  return message("errUnsupported");
}

/**
 * メッセージを送り、受け手がいたかどうかを返す。
 *
 * まだ注入されていないタブへ送ると例外になるが、それは異常ではなく
 * 「初回だった」というだけなので、真偽値に潰す。
 *
 * @param tabId 送り先のタブ
 * @param message 送るメッセージ
 * @returns 受け手がいれば `true`、まだ注入されていなければ `false`
 */
async function send(tabId: number, message: Message): Promise<boolean> {
  try {
    await chrome.tabs.sendMessage(tabId, message);
    return true;
  } catch {
    return false;
  }
}
