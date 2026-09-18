# ストア掲載用の文面

Chrome Web Store のデベロッパーダッシュボードに貼る文面。ダッシュボードは
言語ごとに説明文を持てるので、`description.en.txt` を英語に、`description.ja.txt` を
日本語に入れる。マークダウンは効かないので、見出しは大文字と空行で分けてある。

- 概要（132 文字まで）は manifest の `description`（`__MSG_appDesc__`）がそのまま使われる
- 説明文は 16,000 文字まで。上の 2 ファイルはどちらも 2,000 文字前後
- カテゴリは「ツール」（Tools）。「生産性」でも通るが、検索で並ぶ競合がツールに集まっている
- スクリーンショットは 1280×800 か 640×400 の PNG / JPEG、最大 5 枚。載せたい順に
  1. 選択範囲の中に「隠す」と「矢印」が付いた状態（ツールバーも写す）
  2. ポインタの下の要素に点線の枠が出ている状態（要素クリックの説明）
  3. インストール時の権限確認ダイアログに警告が無いこと
  4. ヘルプパネル
- 撮影の題材には `demo.html` を使う。架空のダッシュボードで、隠したいもの（メール、電話、
  カード番号、API キー、アバター、生年月日）と、囲いたい・指したいもの（失敗した行、ボタン）を
  1 画面に集めてある。1280×800 の窓でちょうど収まる。`file://` で開くと拡張の「ファイルの URL への
  アクセスを許可」が要るので、`python3 -m http.server --directory store` で開くほうが早い
  - `demo.html?lang=ja` で案内が日本語になる
  - `demo.html?clean` で右下の案内が消える。ストア用の撮影はこちら
- 撮影した画像はツールバーが日本語 UI。英語の説明文には「UI はブラウザの言語に従う。
  画像は日本語のブラウザで撮った」と注記してある（`description.en.txt` の冒頭）。
  英語 UI で撮り直すときは、Mac では `chrome://settings/languages` では変えられない。
  システム設定 → 一般 → 言語と地域 → アプリケーションで Google Chrome を英語にして再起動する。
  戻すときは同じ場所で Chrome の項目を削除する
- 撮った画像は `screenshots/` に 1280×800 で置く。Retina の元画像は
  `magick 元.png -crop 2400x1500+0+71 +repage -resize 1280x800! 出力.png` で 16:10 に切って縮めた
- 小さいプロモタイル（440×280）は任意だが、検索結果とカテゴリ一覧に出るので用意しておくと目立つ
- 「プライバシーへの取り組み」の欄は `PRIVACY.md` の内容と一致させる。データを収集しない、
  リモートコードを使わない、の 2 点にチェック

## 紹介ページ（GitHub Pages）と公式 URL

`docs/` が紹介ページ。`docs/index.html` 1 枚で、画像は `docs/img/` に置いてある（ストア用と同じもの）。
外部リソースは読み込まない。言語は `?lang=ja` / `?lang=en` か、無ければブラウザの言語で決まる。

2026-09-18 に公開済み: https://kojirock5260.github.io/snap-redact/ （Pages の配信元は `main` の `/docs`）。
`docs/` に push すれば 1〜2 分で反映される。

所有権確認と公式 URL は保留中。やるときの手順:

3. Search Console（https://search.google.com/search-console）で「URL プレフィックス」としてその URL を追加し、
   「HTML タグ」の確認方法で出るトークンを `docs/index.html` の `google-site-verification` のコメントに入れて push
4. 確認が通ったら、Chrome Web Store のダッシュボード → ストアの掲載情報 → 「公式 URL」でそのサイトを選ぶ。
   同じ Google アカウントで Search Console に確認済みのサイトだけが候補に出る

Zenn の記事は 2026-09-18 に公開済み: https://zenn.dev/kojirock/articles/504b403e72b683
`zenn.md` は公開した版の控え。README（日英）と紹介ページのフッターからリンクしてある。
