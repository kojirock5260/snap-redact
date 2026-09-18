# Microsoft Edge アドオンへの掲載

> **経緯（2026-09-18）。** Partner Center の登録フォームの住所欄に「利用者が開発者プロフィールで見る住所」と
> 書かれており、個人の住所が公開される可能性を否定できなかったため、いったん中止した。
> その後、公開して構わないバーチャルオフィスの住所を使うことにして再開。自宅の住所は入れない。
> 住所そのものは、このリポジトリ（公開）には書かない。

Chrome 用の zip がそのまま通る。manifest は MV3 で、Edge は Chrome と同じ版番号を使うので
`minimum_chrome_version` もそのまま効く。必要なのは Partner Center の登録（Microsoft アカウント）だけ。

https://partner.microsoft.com/dashboard/microsoftedge/

## 動作確認

2026-09-18 に macOS の Edge で 1.0.0 を確認済み。Chrome の設定を取り込むと、Edge が Chrome Web Store から
自動で入れ直す（その状態で試した）。アイコン、右クリックメニュー、`⌘⇧E` のどれからも起動でき、
範囲選択・要素クリックの黒塗り・コピーまで問題なし。`⌘⇧E` は Edge の「サイドバーで検索」と
同じキーだが、拡張のほうが優先されて起動した。

## 入れる項目

| 項目 | 入れる値 |
|---|---|
| パッケージ | `snap-redact-1.0.0.zip`（Chrome と同じもの） |
| 表示名 | manifest の `name`（Snap Redact）が自動で入る |
| 説明（10,000 字まで） | `description.en.txt` / `description.ja.txt` を言語ごとに |
| 短い説明（250 字まで） | 下の「短い説明」 |
| 検索語（最大 7 語） | 下の「検索語」 |
| ストアのロゴ（300×300 PNG、必須） | `edge-logo-300.png` |
| スクリーンショット（640×480 か 1280×800、最大 10 枚） | `screenshots/01-annotate.png` `02-click-to-hide.png` `03-pasted.png` |
| カテゴリ | Productivity |
| プライバシーポリシーの URL | https://github.com/kojirock5260/snap-redact/blob/main/PRIVACY.md |
| Web サイトの URL | https://github.com/kojirock5260/snap-redact |
| サポート連絡先 | https://github.com/kojirock5260/snap-redact/issues |
| 成人向けコンテンツ | いいえ |
| 公開範囲 | Public |
| 市場 | すべて |

## 短い説明

英語:

> Select an area of a page, hide it, box it, point at it, then copy. No install warnings, no network. Everything stays on your machine.

日本語:

> 範囲を選んで、隠して、囲って、指して、そのままクリップボードへ。インストール時の警告なし、通信なし。画像はマシンの外に出ません。

## 検索語

英語: `screenshot`, `redact`, `black out`, `annotate`, `privacy`, `capture`, `arrow`

日本語の掲載を分けて入れる場合: `スクリーンショット`, `黒塗り`, `キャプチャ`, `注釈`, `矢印`

## 審査担当者への注記（Notes for certification）

> No account or sign-in is needed. To test: open any https page, click the toolbar icon
> (or press Ctrl+Shift+E), drag an area, press 1 and click an element to black it out,
> then press Ctrl+C. The image lands on the clipboard. The extension makes no network
> requests and stores nothing; permissions are activeTab, scripting and contextMenus only.

## 掲載後

- Chrome と同じ zip なので、版を上げるときは両方に上げる
- README の「インストール」に Edge アドオンのリンクを足す
