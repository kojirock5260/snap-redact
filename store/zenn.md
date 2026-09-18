---
title: "権限の警告ゼロ・通信ゼロで、スクリーンショットの範囲を黒塗りしてそのまま貼る Chrome 拡張を作った"
emoji: "⬛"
type: "tech"
topics: ["chrome", "chromeextension", "typescript", "screenshot", "privacy"]
published: false
---

画面の一部を Slack やバグ報告に貼りたい。ただしメールアドレスやカード番号は隠したいし、見てほしい所には矢印を付けたい。そのたびに OS のスクリーンショットを撮って、画像編集アプリで開いて、塗って、書き出して、貼る。これが面倒で、Chrome 拡張を作りました。

**Snap Redact**: 範囲を選んで、隠して、囲って、指して、そのままクリップボードへ。

- Chrome Web Store: https://chromewebstore.google.com/detail/snap-redact/nfbcdbkbgboollbanfadblakbihlkbpe
- GitHub: https://github.com/kojirock5260/snap-redact

![Snap Redact の編集画面。選択範囲の中でメールと電話が黒塗りされ、ボタンに枠と矢印が付いている](https://raw.githubusercontent.com/kojirock5260/snap-redact/main/store/screenshots/01-annotate.png)

## 既存の拡張で困っていたこと

スクリーンショット系の拡張はたくさんあります。ただ、入れようとすると次のどれかに当たります。

- インストール時に「すべてのウェブサイトのデータの読み取りと変更」と出る
- 撮った画像がどこかのサーバーに上がる（編集画面が外部サイト）
- ページ全体キャプチャ、録画、OCR、クラウド保存と機能が多く、範囲を撮るだけなのに何度もクリックする
- 隠す手段がぼかしやモザイクで、あとから復元されうる

「範囲を選んで、隠して、貼る」だけがしたい。それだけを、権限も通信も増やさずに作りたい、というのが動機です。

## 決めたこと

### インストール時の警告を出さない

`permissions` は `activeTab` / `scripting` / `contextMenus` の 3 つだけです。どれも警告が出ません。

取りたくなるのに取らなかった権限が 2 つあります。

- `clipboardWrite`: 付けると「コピー＆ペーストするデータの変更」という警告が出る。代わりに、キー操作（`⌘C` / `Enter`）やボタンのクリックを起点に `navigator.clipboard.write` を呼ぶと、権限なしで通ります
- `downloads`: 付けると「ダウンロードを管理」という警告が出る。`a` 要素の `download` 属性をクリックするだけで同じことができるので不要でした

```ts
export async function copyPng(blob: Blob): Promise<CopyOutcome> {
  // http: のページでは Clipboard API 自体が使えない。保存に誘導する
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
```

### 外部と通信しない

サーバーも解析もクラウド保存も外部フォントもありません。`storage` 権限も取っていないので、設定すら保存しません。撮った画像はページの中の canvas で処理して、クリップボードかダウンロードに渡すだけです。

「通信ゼロ」を確かめたい人がバンドルを grep したときに `fetch` が 1 件も出ないように、Vite が既定で埋め込む modulepreload の polyfill も外してあります。

### 隠す手段は不透明な単色だけ

ぼかしとモザイクは用意していません。どちらも元の画像が推定されることがあり、一度共有したスクリーンショットは取り消せないからです。黒く塗った所は画像から消えています。

### 範囲を撮るだけ

ページ全体のキャプチャは他の拡張が十分やっているので入れていません。テキスト注釈もありません。「矢印のところ」と画像の横に書けば足ります。

## 使い方

ツールバーのアイコン、右クリックメニュー、`⌘⇧E`（Windows は `Ctrl+Shift+E`）のどれかで起動します。画面が暗くなるので、

1. ドラッグで範囲を選ぶ。または要素を 1 回クリックして、その要素の矩形をそのまま範囲にする
2. `1` 隠す、`2` 囲う、`3` 矢印。範囲の中でドラッグして描く。「隠す」か「囲う」を持って要素をクリックすると、その要素にぴったり付く
3. `⌘C` でコピー、`⌘S` で PNG 保存。どちらもオーバーレイが閉じて終わり

マウスを載せている間だけ出るメニューを撮りたいときは、キーボードで起動します。アイコンや右クリックへポインタを動かすとホバーが外れて消えてしまいますが、キーならポインタは載せたままです。

## 実装で工夫したところ

### 撮影と注入の流れ

Service Worker で `chrome.tabs.captureVisibleTab` が返す PNG の data URL を、コンテンツスクリプトに渡して Shadow DOM の中の canvas に描いています。撮る前に必ず前回のオーバーレイへ「閉じろ」と送っているのが要点で、これをしないと連続で起動したときに暗転した画面がそのまま次の画像に写り込みます。

```ts
const alive = await send(tabId, { type: "abort" });
if (alive) {
  await sleep(REPAINT_MS); // 閉じたあとの再描画を待つ
}
const [dataUrl] = await Promise.all([
  chrome.tabs.captureVisibleTab({ format: "png" }),
  alive ? null : chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] }),
]);
await chrome.tabs.sendMessage(tabId, { type: "start", dataUrl });
```

### 要素をクリックして選ぶ

オーバーレイはページの上に被さっているので、普通の当たり判定ではオーバーレイ自身しか取れません。`document.elementsFromPoint` はその点にある要素を奥まで全部返すので、自分（Shadow DOM のホスト）と `html` / `body` を除けば、残りがページの要素です。手前から順に見て、小さすぎるものと画面全体を覆うものを飛ばし、最初に使える矩形を採用します。

```ts
export function rectsUnder(p: Point, host: Element): Rect[] {
  return document
    .elementsFromPoint(p.x, p.y)
    .filter((el) => el !== host && el !== document.documentElement && el !== document.body)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
}
```

ページの DOM は書き換えません。矩形を借りて、撮った絵の上に置くだけです。だから見えているものと結果は常に一致します。自動検出もあえて持たせていません。何を隠すかは毎回人が決めます。

### 二重注入への備え

拡張を読み込み直すと古いコンテンツスクリプトは死にますが、`window` に付けた印はページに残ります。「もう入れた」という真偽値で判断すると、死んだ購読を生きていると誤解して、以後そのタブでは何も起きなくなります。なので印ではなく listener の実体を `window` に控えておき、次に注入されたときは外してから貼り直しています。

### テストできる形にする

`domain`（純粋なルール）、`application`（ブラウザ API 越しの副作用）、`presentation`（Shadow DOM と canvas）の三層で、`domain` は上の層を import しません。キー解釈、矢印の穂先の幾何、どのページで使えるか、要素の矩形の選び方といった壊れやすい所を、DOM なしで Vitest から叩けます。

対訳（`_locales/ja` と `_locales/en`）の抜けもテストで見ています。`chrome.i18n.getMessage` は見つからないキーに空文字を返すので、片方の言語だけボタンの文字が消える事故を、ソース中の `message("...")` を拾って機械的に防いでいます。

### ビルド

Vite を 2 回走らせて、Service Worker とコンテンツスクリプトをそれぞれ IIFE の 1 ファイルにしています。manifest に `"type": "module"` を書いておらず、`executeScript` の `files` も古典スクリプトとして評価されるので、`import` が残っていると動かないためです。

## できないこと

- ブラウザ自身が描くもの（ネイティブの右クリックメニュー、`<select>` の選択肢、`title` のツールチップ）は写りません。`captureVisibleTab` はタブの中身しか撮らないからです。Web アプリが HTML で描く独自メニューなら撮れます
- ウェブストアと `chrome://` では動きません。`file://` は「ファイルの URL へのアクセスを許可」が要ります
- `http:` のページではブラウザがクリップボードへの書き込みを拒否するので、保存に誘導します

## おわりに

「範囲を選んで、隠して、貼る」だけの道具ですが、そのぶん一往復で終わります。バグ報告や提案は GitHub の Issue へお願いします。Pull Request は、セキュリティ方針としていまのところ受け付けていません。

このプロジェクトは Claude（Anthropic）を活用して開発しています。
