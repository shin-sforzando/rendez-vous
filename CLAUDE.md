# rendez-vous

## プロジェクト概要

**rendez-vous** は、複数人の集合場所として最適な地点を探すWebアプリケーション。

- 複数人の飲み会で、全員の住んでいる場所からの距離の和が最小となる場所を探したい
- 既存サービスは幾何的中間地点（centroid）のみを提供することが多いが、本アプリでは**centroidとgeometric median（ウェーバー点）の両方**を計算・表示する
  - **Centroid**: 座標の単純平均。外れ値（遠くに住んでいる人）に引っ張られやすい
  - **Geometric Median**: 全員からの距離の和が最小となる点。外れ値に強い

## ルール

- ユーザとの応答は全て日本語
- ソースコード中のコメントおよびログ出力等は全て英語
- 不確かな情報は必ず確認してから回答せよ（特に日付、バージョン情報、コマンド名など）
  - Claude Codeの知識は2年ほど古い
  - ユーザから提示されたURLは必ず参照せよ
- Git操作は基本的に全てユーザが行う
  - mainブランチへの直接コミットは厳禁
  - 作業を始める前に着手するIssue番号を用いて、 `{0埋め3桁のIssue番号}_内容の要約` (例. `019_prepare_gha`)というブランチを作成
- 既存の実装パターンを必ず確認せよ
  - 新しい機能を追加する前に、必ず既存コードの実装パターンを確認
- LinterやFormatterの警告を無視してはいけない
  - LinterやFormatterの警告がある限りコミットは失敗するよう設定されている
  - `biome-ignore` 等で無視するのも本質的な解決ではないので禁止
- コマンド実行は必ず `package.json` の scripts を使え（`npm run check`, `npm run test` 等）
  - `pretest` 等のライフサイクルスクリプトが活用されているため、`npm run` 経由でないと意図した動作にならない
- 機能追加に伴って、ユニットテスト、統合テスト、E2Eテストを拡充せよ
  - テストが全て合格し、カバレッジが十分でない限りコミットは失敗するよう設定されている

## 技術スタック

| カテゴリ | 技術 |
| --------- | ------ |
| フレームワーク | React + Vite + TypeScript |
| CSSフレームワーク | DaisyUI (Tailwind CSS) |
| フォーマッター/リンター | Biome.js |
| 地図ライブラリ | Leaflet + react-leaflet |
| 地図タイル | OpenStreetMap |
| 駅データ | 静的JSON（`public/stations.json`、ビルド時生成・Pages配信） |
| デプロイ | Cloudflare Pages |
| URL | <https://rendez-vous.pages.dev> |

バックエンドDBは持たない。駅名検索・最寄り駅検索はフロントで静的データに対して実行する（`src/lib/stationData.ts`）。駅データは `npm run generate:stations <geojson>` で `public/stations.json` を再生成する。

## 参考リンク

- [国土数値情報 駅データ](https://nlftp.mlit.go.jp/ksj/)
- [Leaflet ドキュメント](https://leafletjs.com/)
- [DaisyUI コンポーネント](https://daisyui.com/components/)
- [Weiszfeld法（Wikipedia）](https://en.wikipedia.org/wiki/Geometric_median#Computation)
