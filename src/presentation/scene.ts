import { HANDLES, handlePoint } from "../domain/handle";
import { type Rect, toRect } from "../domain/rect";
import { arrowGeometry, REDACT_COLOR, type Shape } from "../domain/shape";

/** 選択範囲の外にかける幕の濃さ。ページの内容が読める程度には薄くしてある。 */
const SCRIM = "rgba(9,11,15,.58)";

/** 矢印の穂先の長さ（CSS ピクセル）。 */
const ARROW_HEAD = 15;

/** ハンドルの 1 辺（CSS ピクセル）。掴めることが分かる範囲でいちばん小さい。 */
const HANDLE_SIZE = 7;

export interface Scene {
  image: CanvasImageSource;
  /** 撮影時のビューポートの大きさ。撮ったあとに窓が変わっても、絵は撮った時のまま。 */
  captured: { w: number; h: number };
  /** 明るく抜く矩形。まだ何も選んでいなければ `null`。 */
  region: Rect | null;
  shapes: readonly Shape[];
  /**
   * 掴めるハンドルを出すか。省略すると出さない。
   *
   * 引いている最中は出さない。指で追っている点の周りに小さな四角が 8 つ湧くと、
   * どこを見ればいいのか分からなくなる。手を離してから出す。
   *
   * 画面表示にしか関係しない。{@link flatten} はこの値を見ないので、書き出した
   * 画像にハンドルが写ることはない。
   */
  handles?: boolean;
}

/**
 * 図形を 1 つ描く。
 *
 * 画面表示と書き出しで同じ関数を使う。別々に書くと、見えているものと保存される
 * ものがずれる余地が生まれるため。
 *
 * @param ctx 描画先。座標は CSS ピクセルで渡す前提で、変換は呼び出し側が掛けておく
 * @param s 描く図形
 */
export function drawShape(ctx: CanvasRenderingContext2D, s: Shape): void {
  const r = toRect(s);

  if (s.tool === "fill") {
    ctx.fillStyle = REDACT_COLOR;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    return;
  }

  if (s.tool === "box") {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    // 線幅の半分だけ内側にずらす。そうしないと枠が選択範囲からはみ出て切れる。
    ctx.strokeRect(r.x + 1.5, r.y + 1.5, Math.max(r.w - 3, 1), Math.max(r.h - 3, 1));
    return;
  }

  const g = arrowGeometry(s, ARROW_HEAD);
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(s.x0, s.y0);
  ctx.lineTo(g.base.x, g.base.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(g.tip.x, g.tip.y);
  ctx.lineTo(g.left.x, g.left.y);
  ctx.lineTo(g.right.x, g.right.y);
  ctx.closePath();
  ctx.fill();
}

/**
 * 画面に出すほうを描く。撮った絵に幕をかけ、選択範囲だけ明るく抜く。
 *
 * 図形は選択範囲でクリップしている。はみ出した分は書き出しに乗らないので、
 * 見えている状態と結果を一致させるにはここで切っておく必要がある。
 *
 * @param ctx 描画先
 * @param scene 撮った絵と選択範囲と図形
 * @param dpr devicePixelRatio。CSS ピクセルで描けるように変換をかける
 * @param viewport 現在の窓の大きさ。撮影時と違っていても幕は窓いっぱいに張る
 */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  dpr: number,
  viewport: { w: number; h: number },
): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, viewport.w, viewport.h);
  ctx.drawImage(scene.image, 0, 0, scene.captured.w, scene.captured.h);
  ctx.fillStyle = SCRIM;
  ctx.fillRect(0, 0, viewport.w, viewport.h);

  const r = scene.region;
  if (!r || r.w < 1 || r.h < 1) {
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.drawImage(scene.image, 0, 0, scene.captured.w, scene.captured.h);
  for (const s of scene.shapes) {
    drawShape(ctx, s);
  }
  ctx.restore();

  // 0.5 ずらすと 1 物理ピクセルの線が半分ににじまず、くっきり出る。
  ctx.strokeStyle = "rgba(255,255,255,.92)";
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

  if (scene.handles) {
    drawHandles(ctx, r);
  }
}

/**
 * 選択範囲を掴めることを見せる。
 *
 * 白い四角に暗い縁を付ける。撮った絵がどんな色でも、どちらか片方は必ず見える。
 *
 * @param ctx 描画先
 * @param r 選択範囲
 */
function drawHandles(ctx: CanvasRenderingContext2D, r: Rect): void {
  const half = HANDLE_SIZE / 2;
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "rgba(9,11,15,.55)";
  ctx.lineWidth = 1;
  for (const h of HANDLES) {
    const c = handlePoint(r, h);
    // 0.5 ずらして枠線を物理ピクセルに乗せる。範囲の枠と同じ理由。
    const x = Math.round(c.x - half) + 0.5;
    const y = Math.round(c.y - half) + 0.5;
    ctx.fillRect(x, y, HANDLE_SIZE, HANDLE_SIZE);
    ctx.strokeRect(x, y, HANDLE_SIZE, HANDLE_SIZE);
  }
}

/**
 * 選択範囲だけを切り出した canvas を作る。これが最終的な成果物。
 *
 * 出力の大きさは CSS ピクセルではなく物理ピクセル（× dpr）にしている。
 * Retina で撮った絵を CSS ピクセルの大きさで書き出すと、情報を持っているのに
 * わざわざ半分に縮めることになり、貼った先で文字がぼやける。
 *
 * @param scene 撮った絵と、切り出す選択範囲と図形
 * @param dpr devicePixelRatio。出力の大きさはこの倍率になる
 * @returns 選択範囲だけを描いた canvas
 */
export function flatten(scene: Scene & { region: Rect }, dpr: number): HTMLCanvasElement {
  const { region } = scene;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(region.w * dpr);
  canvas.height = Math.round(region.h * dpr);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(-region.x, -region.y);
  ctx.drawImage(scene.image, 0, 0, scene.captured.w, scene.captured.h);
  for (const s of scene.shapes) {
    drawShape(ctx, s);
  }
  return canvas;
}
