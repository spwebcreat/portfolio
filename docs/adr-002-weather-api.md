# ADR-002: 天気API連動による3Dシーンの動的演出

## ステータス

承認済み — 2026-02-24

## コンテキスト

ポートフォリオサイトの3Dシーン（`ThreeScene`）には、リアルタイム連動の段階的ロードマップが存在する（→ `docs/3d-tuning-guide.md` §15）。

- **レイヤー1: 時間帯**（`useTimeOfDay`）— 実装済み
- **レイヤー2: 天気API** — 本ADRの対象
- **レイヤー3: アクティビティ** — 未着手

訪問者がサイトを開いた時、現実の天気がシーンに反映されることで「生きているポートフォリオ」の印象を強化する。

## 決定

### API選定: Open-Meteo

| 候補 | 判定 | 理由 |
|------|------|------|
| **Open-Meteo** | **採用** | 無料・APIキー不要・CORS対応・クライアントサイドfetch可能 |
| OpenWeatherMap | 不採用 | APIキー必要 → 環境変数管理 or サーバーサイドプロキシが必要 |
| WeatherAPI.com | 不採用 | 無料枠の制限がOpen-Meteoより厳しい |

### 位置情報

- デフォルト: 東京（lat: 35.6762, lon: 139.6503）
- 「My Location」ボタンで `navigator.geolocation` に切替
- 逆ジオコーディング（Nominatim / OpenStreetMap）で座標→地名を自動取得
- ジオロケーション拒否・タイムアウト時は東京にフォールバック

### 天気カテゴリとエフェクト

WMO Weather interpretation codes を以下のカテゴリにマッピング:

| カテゴリ | Phase | ambient | dir | cyan | cloud boost | rain | 演出 |
|----------|-------|---------|-----|------|-------------|------|------|
| Clear | 1 | ×1.1 | ×1.0 | ×1.0 | +0.00 | 0 | 明るめ、雲ほぼ透明 |
| Clouds | 1 | ×0.85 | ×0.7 | ×0.95 | +0.08 | 0 | やや暗い、雲が厚くなる |
| Fog | 1 | ×0.75 | ×0.5 | ×0.9 | +0.12 | 0 | 雲が非常に厚い |
| Rain | 1 | ×0.65 | ×0.4 | ×0.85 | +0.15 | 1.0 | 雨粒パーティクル + 暗い雲 |
| Thunderstorm | 2 | ×0.5 | ×0.25 | ×0.7 | +0.20 | 1.0 | 将来: 白フラッシュ追加 |
| Snow | 2 | ×0.8 | ×0.6 | ×1.1 | +0.10 | 0 | 将来: 白パーティクル |

### ライティング合成方式

既存のスクロール × 時間帯に天気倍率を乗算:

```
ambient.intensity = AMBIENT_BASE × scrollTime.intensity × timeMultiplier × weatherMultiplier
dir.intensity     = DIR_BASE × scrollTime.dirIntensity × timeMultiplier × weatherDirMultiplier
cyan.intensity    = CYAN_BASE × scrollTime.cyanIntensity × timeCyanMul × pulse × dbBoost × weatherCyanMultiplier
```

天気倍率は `useRef` + `lerp(rate: 0.02)` で目標値に滑らかに遷移（約2秒）。
`weatherEnabled === false` または `weather === null` の場合は全倍率 1.0（ニュートラル）。

### キャッシュ戦略

- モジュールレベル変数でキャッシュ（TTL: 30分）
- 同一座標・TTL内は再fetchしない
- ブラウザリロード時のみキャッシュがクリアされる

## ファイル構成

```
src/components/ThreeModel/
├── weatherTypes.ts           # 型定義・WMOコード→カテゴリ・倍率テーブル
├── useWeather.ts             # fetch + キャッシュ + 位置管理 + 逆ジオコーディング + 手動オーバーライド
├── WeatherEffects.tsx        # RainParticles コンポーネント
├── WeatherPanel.tsx          # 天気UI（トグル・ステータス・位置切替・Previewセレクタ）
├── WeatherPanel.module.styl  # 天気UIのスタイル
└── index.tsx                 # SceneLighting に天気倍率追加、Cloud動的化、統合
```

### RainParticles 仕様

- パーティクル数: 800（モバイル: 400）
- 生成範囲: XZ ±4, Y: 4〜6（城の上空）
- 落下速度: 3.0〜5.0 units/s
- 風ドリフト: `windSpeed / 50 * 0.5` の水平移動
- `intensity <= 0.01` で早期リターン（Clear時はオーバーヘッドゼロ）
- `<BloomExcluded>` でブルーム対象から除外

### UI 仕様

```
画面右下（position: fixed, z-index: 500）:

  [Weather Panel]
    ☀️ Tokyo 18°C 快晴     ← 天気ステータス（ロケーション名・気温・天気）
    [Tokyo] [My Location]   ← 位置切替
    [Preview ▼]             ← 手動セレクタ開閉
      Clear|Clouds|Rain|Fog ← Previewボタン（展開時）
  [🌤 Weather ON]           ← トグルボタン
  [🕐 Time ON]              ← 既存トグル
```

- My Location 選択時: 逆ジオコーディングで取得した地名を表示（例: `横浜市`, `渋谷区`）
- 手動オーバーライド時: 「Manual」バッジ表示
- 同じカテゴリの再クリックでオーバーライド解除（API天気に戻る）

## エラーハンドリング

| ケース | 挙動 |
|--------|------|
| Weather API fetch失敗 | `weather: null` → 全倍率 1.0（天気なしと同じ見た目） |
| ジオロケーション拒否・タイムアウト | 東京にフォールバック |
| 逆ジオコーディング失敗 | 「My Location」表示にフォールバック |
| 不明なWMOコード | `'clear'` にフォールバック |
| SSGビルド時 | `useEffect` 内でのみfetch → ビルド影響なし |

## 将来の拡張（Phase 2）

- Thunderstorm: 白フラッシュ（PointLight フリッカー）
- Snow: 白パーティクルがゆっくり降下
- サウンドエフェクト: 雨音・雷鳴（ユーザーインタラクション後に再生）

## 不採用にした案

- **サーバーサイドプロキシ**: APIキー隠蔽のために Astro API ルートを使う案。Open-Meteo はキー不要なので不要
- **天気データの SSG 埋め込み**: ビルド時の天気が固定される。リアルタイム性が失われるため不採用
- **Web Worker での fetch**: 30分に1回のfetchでは Worker のオーバーヘッドが見合わない
