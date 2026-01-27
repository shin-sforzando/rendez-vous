# rendez-vous

## プロジェクト概要

**rendez-vous** は、複数人の集合場所として最適な地点を探すWebアプリケーション。

### 解決する課題

- 複数人の飲み会で、全員の住んでいる場所からの距離の和が最小となる場所を探したい
- 既存サービスは幾何的中間地点（centroid）のみを提供することが多いが、本アプリでは**centroidとgeometric median（ウェーバー点）の両方**を計算・表示する

### CentroidとGeometric Medianの違い

- **Centroid**: 座標の単純平均。外れ値（遠くに住んでいる人）に引っ張られやすい
- **Geometric Median**: 全員からの距離の和が最小となる点。外れ値に強い

## 技術スタック

| カテゴリ | 技術 |
| --------- | ------ |
| フレームワーク | React + Vite + TypeScript |
| CSSフレームワーク | DaisyUI (Tailwind CSS) |
| フォーマッター/リンター | Biome.js |
| 地図ライブラリ | Leaflet + react-leaflet |
| 地図タイル | OpenStreetMap |
| バックエンド | Supabase (PostgreSQL + PostGIS) |
| デプロイ | Cloudflare Pages |
| URL | <https://rendez-vous.pages.dev> |

## 機能要件

### Phase 1（MVP）

- [ ] 地点入力（2種類）
  - テキスト入力（駅名オートコンプリート付き）
  - 地図上へのピン刺し
- [ ] 最大10人まで対応
- [ ] CentroidとGeometric Medianの両方を計算・表示
- [ ] 各入力地点から結果地点までの距離を表示
- [ ] 地球の曲率を考慮した距離計算（Haversine公式）

### Phase 2（将来）

- [ ] 周辺POI検索（Overpass API）
- [ ] 駅の特性ラベリング（居酒屋密度、デート向き、終電の便など）

## データ設計

### Supabase テーブル構造

```sql
CREATE TABLE stations (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,      -- 渋谷
  name_kana     TEXT NOT NULL,      -- しぶや
  name_romaji   TEXT,               -- shibuya（後から追加可）
  lat           DOUBLE PRECISION NOT NULL,
  lon           DOUBLE PRECISION NOT NULL,
  prefecture    TEXT,
  location      GEOGRAPHY(POINT, 4326),  -- PostGIS用
  
  -- ラベル（NULLable、後から手動で追加）
  izakaya       SMALLINT,
  date_friendly SMALLINT,
  late_night    SMALLINT
);

-- 前方一致検索用インデックス
CREATE INDEX idx_name ON stations USING btree (name text_pattern_ops);
CREATE INDEX idx_kana ON stations USING btree (name_kana text_pattern_ops);

-- 空間インデックス
CREATE INDEX idx_location ON stations USING GIST (location);
```

### データソース

- 駅データ: 国土数値情報（約9,000駅、CC BY 4.0）
- ローマ字: 別途Wikipedia等から取得予定

## アルゴリズム

### Centroid（重心）の計算

緯度経度を直接平均するのではなく、3D直交座標系（ECEF）に変換してから平均し、球面に投影し直す。

### Geometric Median（ウェーバー点）の計算

Weiszfeld法による反復計算：

1. 初期点としてCentroidを使用
2. 各入力点への距離の逆数で重み付けした加重平均を計算
3. 収束するまで繰り返し（入力点との一致時は0除算回避のためε処理）

### 距離計算

Haversine公式を使用（球面近似、日本国内なら十分な精度）。

## 開発セットアップ

```bash
# 初期セットアップ
npm create vite@latest . -- --template react-ts
npm install

# 必要なパッケージ
npm install leaflet react-leaflet @supabase/supabase-js
npm install -D @types/leaflet tailwindcss daisyui @biomejs/biome

# 開発サーバー起動
npm run dev

# フォーマット
npx biome format --write .

# リント
npx biome lint .
```

## ディレクトリ構成（想定）

```plain
rendez-vous/
├── src/
│   ├── components/
│   │   ├── Map.tsx           # Leaflet地図コンポーネント
│   │   ├── LocationInput.tsx # 地点入力フォーム
│   │   ├── ResultCard.tsx    # 結果表示カード
│   │   └── StationSearch.tsx # 駅名オートコンプリート
│   ├── hooks/
│   │   └── useSupabase.ts    # Supabaseクライアント
│   ├── lib/
│   │   ├── geo.ts            # Centroid/GeometricMedian計算
│   │   └── haversine.ts      # 距離計算
│   ├── types/
│   │   └── index.ts          # 型定義
│   ├── App.tsx
│   └── main.tsx
├── CLAUDE.md
├── biome.json
├── tailwind.config.js
└── vite.config.ts
```

## 環境変数

```plain
VITE_SUPABASE_URL=<Supabase Project URL>
VITE_SUPABASE_ANON_KEY=<Supabase Anon Key>
```

## 参考リンク

- [Supabase PostGIS ドキュメント](https://supabase.com/docs/guides/database/extensions/postgis)
- [国土数値情報 駅データ](https://nlftp.mlit.go.jp/ksj/)
- [Leaflet ドキュメント](https://leafletjs.com/)
- [DaisyUI コンポーネント](https://daisyui.com/components/)
- [Weiszfeld法（Wikipedia）](https://en.wikipedia.org/wiki/Geometric_median#Computation)
