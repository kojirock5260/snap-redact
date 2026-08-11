import { copyPng } from "../application/clipboard";
import { savePng } from "../application/download";
import { message } from "../application/i18n";
import { snapFileName } from "../domain/filename";
import { type Handle, handleAt, handleCursor, resizeRect } from "../domain/handle";
import type { Action } from "../domain/keymap";
import { resolveKey } from "../domain/keymap";
import { clampPoint, contains, type Drag, type Point, type Rect, toRect } from "../domain/rect";
import { COLORS, isDrawable, MIN_SELECTION, type Shape, type ToolId } from "../domain/shape";
import css from "./overlay.css?raw";
import { drawScene, flatten } from "./scene";
import { createHelp, createToolbar, mod, type Toolbar } from "./toolbar";

/** コピーや保存のあと、結果を読ませてから閉じるまでの間（ミリ秒）。 */
const CLOSE_DELAY_MS = 420;

/** トーストを出しておく時間（ミリ秒）。失敗の案内を読み切れる程度に取る。 */
const TOAST_MS = 3000;

type Timer = ReturnType<typeof setTimeout>;

/**
 * 1 回ぶんの編集。
 *
 * 編集中の値と画面の部品を 1 つにまとめてある。どちらも起動から終了までしか生きず、
 * 片方だけが在る状態は無い。分けて持っていると、触るたびに両方の有無を確かめる
 * ことになり、そのガードが本題を埋めてしまう。
 *
 * 以下の関数はこれを引数で受け取る。null を持ち回らないので、中で有無を確かめる
 * 必要がない。「開いていない状態」を知っているのは {@link session} だけ。
 *
 * interface ではなく type にしてあるのは lint のため。Biome 2.5 の
 * noUnnecessaryConditions は interface を解決できず、`if (!s)` のような無駄な
 * ガードを見逃す。type なら検知できるので、あとから戻さないこと。
 */
type Session = {
  phase: "select" | "annotate";
  image: HTMLImageElement;
  dpr: number;
  captured: { w: number; h: number };
  region: Rect | null;
  drag: (Drag & { tool?: ToolId; color?: string }) | null;
  /**
   * 掴んでいる選択範囲のハンドルと、掴んだ時点の矩形。掴んでいなければ `null`。
   *
   * {@link Session.drag} と別に持っている。あちらは「引いた軌跡」だが、こちらは
   * 「どの辺を、どこから動かしているか」だから。
   *
   * `from` を控えているのは、Esc で調整を取り消したときに戻す先が要るため。
   */
  resizing: { handle: Handle; from: Rect } | null;
  shapes: Shape[];
  tool: ToolId;
  color: string;
  helpOpen: boolean;

  host: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  sizeTag: HTMLElement;
  toast: HTMLElement;
  help: HTMLElement;
  toolbar: Toolbar;

  /**
   * 走っているタイマー。
   *
   * セッションに持たせてあるので、閉じれば必ず一緒に消える。モジュール変数に
   * 置くと、保存してから閉じるまでの 420ms のうちに開き直されたとき、前回の
   * 予約が新しいオーバーレイを閉じてしまう。
   */
  timers: { close: Timer | null; toast: Timer | null };

  /** 貼った listener を剥がし、画面から取り除く。 */
  close: () => void;
};

/** 開いているセッション。「無いかもしれない」のはこの変数だけ。 */
let session: Session | null = null;

/**
 * オーバーレイを開く。すでに開いていれば、閉じてから開き直す。
 *
 * @param dataUrl Service Worker が撮った表示領域の PNG
 * @returns 画面に出し終えると解決する Promise
 * @throws dataUrl を画像として読めなかった場合
 */
export async function mountOverlay(dataUrl: string): Promise<void> {
  unmountOverlay();
  const s = open(await loadImage(dataUrl));
  session = s;
  render(s);
}

/**
 * オーバーレイを閉じて、ページを元通りにする。開いていなければ何もしない。
 */
export function unmountOverlay(): void {
  session?.close();
  session = null;
}

// ---------- 組み立て ----------

/**
 * 画面を組み立て、listener を貼ってセッションを作る。
 *
 * @param image 撮った表示領域の画像
 * @returns 走り出したセッション
 * @throws canvas の 2d コンテキストを取れなかった場合
 */
function open(image: HTMLImageElement): Session {
  const host = document.createElement("div");
  // ページ側の CSS に一切影響されないよう、all:initial と Shadow DOM で二重に隔離する。
  host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;";
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = css;

  const stage = document.createElement("div");
  stage.className = "stage";

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2d context is unavailable");
  }

  const sizeTag = document.createElement("div");
  sizeTag.className = "size";
  const toast = document.createElement("div");
  toast.className = "toast";
  const help = createHelp();

  // 下で作る s を掴むだけの包み。剥がすときに同じ参照が要るので変数に取る。
  const onDown = (e: PointerEvent): void => down(s, e);
  const onMove = (e: PointerEvent): void => move(s, e);
  const onUp = (): void => up(s);
  const onKey = (e: KeyboardEvent): void => key(s, e);
  const onResize = (): void => resize(s);

  const s: Session = {
    phase: "select",
    image,
    dpr: window.devicePixelRatio || 1,
    captured: { w: window.innerWidth, h: window.innerHeight },
    region: null,
    drag: null,
    resizing: null,
    shapes: [],
    tool: "fill",
    color: COLORS[0],
    helpOpen: false,

    host,
    canvas,
    ctx,
    sizeTag,
    toast,
    help,
    toolbar: createToolbar({
      onTool: (tool) => setTool(s, tool),
      onColor: (color) => setColor(s, color),
      onUndo: () => undo(s),
      onSave: () => save(s),
      onCopy: () => void copy(s),
      onHelp: () => setHelp(s, !s.helpOpen),
    }),

    timers: { close: null, toast: null },
    close: () => {
      clearTimeout(s.timers.close ?? undefined);
      clearTimeout(s.timers.toast ?? undefined);
      // stage に貼ったぶんは host ごと外れるので、残るのは window のものだけ。
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onResize, true);
      host.remove();
    },
  };

  stage.append(canvas, sizeTag, help, s.toolbar.el, toast);
  shadow.append(style, stage);
  document.documentElement.append(host);

  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerup", onUp);
  // ページが動くと、固定された絵とのずれが目に見えてしまう。
  stage.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });
  stage.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("resize", onResize, true);

  sizeCanvas(s);
  s.toolbar.sync(s.tool, s.color);
  return s;
}

/**
 * canvas を窓いっぱいに合わせる。中身は消えるので、呼んだあとは描き直す。
 *
 * @param s 対象のセッション
 */
function sizeCanvas(s: Session): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  s.canvas.style.width = `${w}px`;
  s.canvas.style.height = `${h}px`;
  s.canvas.width = Math.round(w * s.dpr);
  s.canvas.height = Math.round(h * s.dpr);
}

// ---------- 入力 ----------

/**
 * ポインタの位置を取り出す。
 *
 * 撮った絵の外へは出さない。窓の外まで引かれた選択範囲をそのまま書き出すと、
 * 絵の無いところが PNG に空白として残る。
 *
 * @param s 対象のセッション
 * @param e ポインタイベント
 * @returns 撮った絵の中に収めたビューポート基準の座標
 */
const point = (s: Session, e: PointerEvent): Point =>
  clampPoint({ x: e.clientX, y: e.clientY }, s.captured.w, s.captured.h);

/**
 * 押されたところからドラッグを始める。
 *
 * @param s 対象のセッション
 * @param e ポインタイベント
 */
function down(s: Session, e: PointerEvent): void {
  if (e.button !== 0) {
    return;
  }
  // ツールバーは stage の中にあるので、押すとここにも届く。素通しにしないと
  // ボタンを押しただけで図形を描き始めてしまう。
  if (s.toolbar.el.contains(e.target as Node | null)) {
    return;
  }

  e.preventDefault();
  const p = point(s, e);
  const region = s.phase === "annotate" ? s.region : null;
  const grabbed = region ? handleAt(region, p) : null;

  if (grabbed && region) {
    // 縁を掴んだので、図形ではなく範囲を動かす。中を掴んだときだけ図形になる。
    // 掴んだ時点の矩形を控えておく。Esc で戻すのに要る。
    s.resizing = { handle: grabbed, from: region };
  } else if (s.phase === "select") {
    s.drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
  } else if (s.region && contains(s.region, p)) {
    // 描き始めたということは、ヘルプはもう読み終わっている。
    if (s.helpOpen) {
      setHelp(s, false);
    }
    s.drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, tool: s.tool, color: s.color };
  }

  (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
  render(s);
}

/**
 * ドラッグの終点を更新して描き直す。引いていなければ何もしない。
 *
 * @param s 対象のセッション
 * @param e ポインタイベント
 */
function move(s: Session, e: PointerEvent): void {
  const p = point(s, e);

  const resizing = s.resizing;
  if (resizing) {
    // 掴んだ時点の矩形から毎回引き直す。今の矩形を継ぎ足すと誤差が溜まる。
    const r = resizeRect(resizing.from, resizing.handle, p, MIN_SELECTION);
    s.region = r;
    render(s);
    // 調整している最中こそ数値が要る。範囲を引くときと同じように出す。
    showSize(s, r, p);
    return;
  }

  const drag = s.drag;
  if (!drag) {
    // 掴んでいないときは、縁に近づいたことをカーソルで知らせる。
    hover(s, p);
    return;
  }
  drag.x1 = p.x;
  drag.y1 = p.y;
  render(s);
  if (s.phase === "select") {
    showSize(s, toRect(drag), p);
  }
}

/**
 * ドラッグを確定する。選択中なら範囲を決め、注釈中なら図形を残す。
 *
 * @param s 対象のセッション
 */
function up(s: Session): void {
  if (s.resizing) {
    s.resizing = null;
    hideSize(s);
    render(s);
    return;
  }

  const drag = s.drag;
  if (!drag) {
    return;
  }
  s.drag = null;

  if (s.phase === "select") {
    hideSize(s);
    const r = toRect(drag);
    if (r.w >= MIN_SELECTION && r.h >= MIN_SELECTION) {
      s.region = r;
      s.phase = "annotate";
      s.toolbar.el.classList.add("on");
    }
  } else if (drag.tool && drag.color) {
    const shape: Shape = { ...drag, tool: drag.tool, color: drag.color };
    if (isDrawable(shape)) {
      s.shapes.push(shape);
    }
  }

  render(s);
}

/**
 * キー入力を操作に変換して実行する。
 *
 * @param s 対象のセッション
 * @param e キーイベント
 */
function key(s: Session, e: KeyboardEvent): void {
  const action = resolveKey(
    { key: e.key, meta: e.metaKey, ctrl: e.ctrlKey },
    { phase: s.phase, helpOpen: s.helpOpen, drawing: s.drag !== null || s.resizing !== null },
  );
  if (!action) {
    return;
  }

  // ページ側にキーを渡さない。Cmd+S でページの保存ダイアログが出ると台無しになる。
  e.preventDefault();
  e.stopPropagation();
  run(s, action);
}

/**
 * 操作を 1 つ実行する。
 *
 * @param s 対象のセッション
 * @param action 実行する操作
 */
function run(s: Session, action: Action): void {
  switch (action.type) {
    case "cancel":
      unmountOverlay();
      return;
    case "cancelDrag":
      cancelDrag(s);
      return;
    case "closeHelp":
      setHelp(s, false);
      return;
    case "toggleHelp":
      setHelp(s, !s.helpOpen);
      return;
    case "copy":
      void copy(s);
      return;
    case "save":
      save(s);
      return;
    case "undo":
      undo(s);
      return;
    case "selectTool":
      setTool(s, action.tool);
      return;
    case "swallow":
      return;
  }
}

/**
 * 引いている最中のものだけ取り消す。
 *
 * 調整中なら掴む前の矩形に戻し、描いている最中ならその図形を捨てる。
 * どちらの場合もオーバーレイは開いたままなので、撮り直しにならない。
 *
 * @param s 対象のセッション
 */
function cancelDrag(s: Session): void {
  const resizing = s.resizing;
  if (resizing) {
    s.region = resizing.from;
    s.resizing = null;
  }
  s.drag = null;
  hideSize(s);
  render(s);
}

/**
 * 窓の大きさが変わったので、canvas を合わせ直して描き直す。
 *
 * @param s 対象のセッション
 */
function resize(s: Session): void {
  sizeCanvas(s);
  render(s);
}

// ---------- 状態 ----------

/**
 * 使う道具を切り替える。
 *
 * @param s 対象のセッション
 * @param tool これから描くのに使う道具
 */
function setTool(s: Session, tool: ToolId): void {
  s.tool = tool;
  s.toolbar.sync(tool, s.color);
}

/**
 * 線の色を切り替える。塗り潰しの色は変わらない。
 *
 * @param s 対象のセッション
 * @param color CSS の色文字列
 */
function setColor(s: Session, color: string): void {
  s.color = color;
  s.toolbar.sync(s.tool, color);
}

/**
 * 直前の 1 つを取り消す。何も無ければ何も起きない。
 *
 * @param s 対象のセッション
 */
function undo(s: Session): void {
  s.shapes.pop();
  render(s);
}

/**
 * ヘルプの開閉を切り替える。
 *
 * @param s 対象のセッション
 * @param open 開くなら `true`
 */
function setHelp(s: Session, open: boolean): void {
  s.helpOpen = open;
  s.help.classList.toggle("on", open);
}

// ---------- 出力 ----------

/**
 * 選択範囲をクリップボードへ書き込み、成功したら閉じる。
 *
 * @param s 対象のセッション
 * @returns 結果を出し終えると解決する Promise
 */
async function copy(s: Session): Promise<void> {
  const canvas = output(s);
  if (!canvas) {
    return;
  }

  const blob = await toPng(canvas);
  const result = blob ? await copyPng(blob) : null;

  // 待っている間に閉じられていることがある。終わったセッションの結果で
  // 今の画面を触らない。ここが唯一「自分がまだ現役か」を確かめる場所。
  if (session !== s) {
    return;
  }

  if (!result) {
    flash(s, message("toastNoImage"));
    return;
  }
  if (result.ok) {
    flash(s, message("toastCopied"));
    closeLater(s);
    return;
  }
  // http: のページでは Clipboard API 自体が使えない。保存なら通る。
  flash(
    s,
    result.reason === "insecure"
      ? message("toastInsecure", mod("S"))
      : message("toastDenied", mod("S")),
  );
}

/**
 * canvas を PNG の Blob にする。
 *
 * @param canvas 変換元
 * @returns PNG の Blob。作れなければ `null`
 */
const toPng = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  new Promise((r) => canvas.toBlob(r, "image/png"));

/**
 * 選択範囲を PNG として保存し、閉じる。
 *
 * @param s 対象のセッション
 */
function save(s: Session): void {
  const canvas = output(s);
  if (!canvas) {
    return;
  }
  savePng(canvas.toDataURL("image/png"), snapFileName(new Date()));
  flash(s, message("toastSaved"));
  closeLater(s);
}

/**
 * 結果を読ませてから閉じる。
 *
 * @param s 対象のセッション
 */
function closeLater(s: Session): void {
  clearTimeout(s.timers.close ?? undefined);
  s.timers.close = setTimeout(unmountOverlay, CLOSE_DELAY_MS);
}

/**
 * 書き出す canvas を作る。
 *
 * @param s 対象のセッション
 * @returns 選択範囲を切り出した canvas。まだ範囲が決まっていなければ `null`
 */
function output(s: Session): HTMLCanvasElement | null {
  if (!s.region) {
    return null;
  }
  return flatten(
    { image: s.image, captured: s.captured, region: s.region, shapes: s.shapes },
    s.dpr,
  );
}

// ---------- 描画 ----------

/**
 * 今の状態を画面に描く。
 *
 * @param s 対象のセッション
 */
function render(s: Session): void {
  // 選択中は引いている途中の矩形を、確定後は選択範囲そのものを明るく抜く。
  const region = s.phase === "select" ? (s.drag ? toRect(s.drag) : null) : s.region;

  // 描いている最中の図形も、確定済みと同じ扱いで見せる。
  const drag = s.drag;
  const preview =
    s.phase === "annotate" && drag?.tool !== undefined && drag.color !== undefined
      ? ({ ...drag, tool: drag.tool, color: drag.color } satisfies Shape)
      : null;
  const shapes = preview ? [...s.shapes, preview] : s.shapes;

  // 引いている最中は出さない。動いている点の周りに四角が湧くと目移りする。
  const handles = s.phase === "annotate" && !s.drag && !s.resizing;

  drawScene(s.ctx, { image: s.image, captured: s.captured, region, shapes, handles }, s.dpr, {
    w: window.innerWidth,
    h: window.innerHeight,
  });
}

/**
 * ポインタの下にあるものに合わせてカーソルを変える。
 *
 * 掴めるかどうかは見た目だけでは分かりにくいので、近づいた時点で形で知らせる。
 *
 * @param s 対象のセッション
 * @param p ポインタの位置
 */
function hover(s: Session, p: Point): void {
  const grabbed = s.region && s.phase === "annotate" ? handleAt(s.region, p) : null;
  s.canvas.style.cursor = grabbed ? handleCursor(grabbed) : "";
}

/**
 * 選択範囲の大きさをポインタの脇に出す。
 *
 * @param s 対象のセッション
 * @param r 今の選択範囲
 * @param p ポインタの位置
 */
function showSize(s: Session, r: Rect, p: Point): void {
  s.sizeTag.textContent = `${Math.round(r.w)} × ${Math.round(r.h)}`;
  s.sizeTag.style.left = `${Math.min(p.x + 12, window.innerWidth - 80)}px`;
  s.sizeTag.style.top = `${Math.min(p.y + 16, window.innerHeight - 28)}px`;
  s.sizeTag.classList.add("on");
}

/**
 * 大きさの表示を消す。
 *
 * @param s 対象のセッション
 */
function hideSize(s: Session): void {
  s.sizeTag.classList.remove("on");
}

/**
 * 結果を短く出す。
 *
 * 成功したときはこのあとオーバーレイごと消えるが、失敗したときは残る。
 * 出しっぱなしにすると、同じ位置に出るヘルプを永久に覆ってしまうので、
 * ヘルプを先に閉じたうえで自分も時間で消える。
 *
 * @param s 対象のセッション
 * @param message 出す文言
 */
function flash(s: Session, message: string): void {
  setHelp(s, false);
  clearTimeout(s.timers.toast ?? undefined);
  s.toast.textContent = message;
  s.toast.classList.add("on");
  s.timers.toast = setTimeout(() => s.toast.classList.remove("on"), TOAST_MS);
}

/**
 * data URL から画像を読み込む。
 *
 * @param src 読み込む画像の data URL
 * @returns 読み込み終わった img 要素
 * @throws 画像として読めなかった場合
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("failed to load the captured image"));
    img.src = src;
  });
}
