---
# 2026-09-18 に公開済み: https://zenn.dev/kojirock/articles/504b403e72b683
# このファイルは公開した版の控え。Zenn の Web エディタで投稿したので、下の設定は画面で入れた値。
title: "スクリーンショットの範囲を黒塗りしてそのまま貼る Chrome 拡張を作った"
emoji: "🖼️"
type: "tech"
topics: ["chrome", "chromeextension", "screenshot"]
published: true
---

画面の一部を Slack やバグ報告に貼りたい。ただしメールアドレスやカード番号は隠したいし、見てほしい所には矢印を付けたい。そのたびに OS のスクリーンショットを撮って、画像編集アプリで開いて、塗って、書き出して、貼る。これが面倒で、Chrome 拡張を作りました。

**Snap Redact**: 範囲を選んで、隠して、囲って、指して、そのままクリップボードへ。

- Chrome Web Store: https://chromewebstore.google.com/detail/snap-redact/nfbcdbkbgboollbanfadblakbihlkbpe
- 紹介ページ: https://kojirock5260.github.io/snap-redact/
- GitHub: https://github.com/kojirock5260/snap-redact

![Snap Redact の編集画面。選択範囲の中でメールと電話が黒塗りされ、ボタンに枠と矢印が付いている](https://kojirock5260.github.io/snap-redact/img/01-annotate.png)
*編集中の画面。範囲の中で「隠す」「囲う」「矢印」を付けて、⌘C でコピーして終わり*

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

![コピーした画像を GitHub の Issue に貼ったところ](https://kojirock5260.github.io/snap-redact/img/03-pasted.png)
*貼った先でそのまま。Retina のピクセル数で書き出すので、文字がぼやけません*

## できないこと

- ブラウザ自身が描くもの（ネイティブの右クリックメニュー、`<select>` の選択肢、`title` のツールチップ）は写りません。`captureVisibleTab` はタブの中身しか撮らないからです。Web アプリが HTML で描く独自メニューなら撮れます
- ウェブストアと `chrome://` では動きません。`file://` は「ファイルの URL へのアクセスを許可」が要ります
- `http:` のページではブラウザがクリップボードへの書き込みを拒否するので、保存に誘導します

## おわりに

「範囲を選んで、隠して、貼る」だけの道具ですが、そのぶん一往復で終わります。バグ報告や提案は GitHub の Issue へお願いします。Pull Request は、セキュリティ方針としていまのところ受け付けていません。

この拡張の開発と、この記事の文章の作成には、Claude を活用しています。
