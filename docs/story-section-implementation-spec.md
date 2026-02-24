# Story セクション仕様書

> 作成日: 2026-02-24
> 最終更新: 2026-02-25
> ステータス: 実装済み

---

## 1. 概要

FV（MainVisual）と About セクションの間に配置されたスクロール連動演出セクション。
スクロールに応じてテキストがフェードイン/アウトし、3Dカメラが城の周囲を巡り、
テキスト内容に合わせてライティングエフェクトが変化する。

**既存の3Dシーン（ThreeModel）の延長として実装。** 新しい Canvas は作らない。

---

## 2. テキスト

### 英語見出し

```
Build Your Digital Castle.
```

### 本文（6ブロック）

```
Block 0:
コードは、ただの文字列じゃない。
設計図であり、構造体であり、
誰かの「こうしたい」を形にする素材。

Block 1:
美しい城には、見えない土台がある。
堅牢な基盤、緻密な設計、細部への執念。
それはWebサイトも同じだと思っている。

Block 2:
約15年、数えきれないサイトを手がけてきた。
デザインもコードも、自分の手で。
その一つひとつが、今の土台になっている。

Block 3:
AIが当たり前になった時代。
素材は増えた。できることも広がった。
でも、城を設計するのは、人だ。

Block 4:
どの素材を選び、どう組み、何を届けるか。
その判断ができるのは、積み上げてきた者だけだと思う。

Block 5:
経験と技術、そして新しい力を携えて。
次の城を、創造しにいく。
```

---

## 3. アーキテクチャ

### 3-1. DOM 配置と z-index

```
MainVisual          z-index: auto (relative)
  ↓
Story (#story)      z-index: 10   (relative, 420vh)
  ↓
main-content        z-index: 99   (relative)
```

- Canvas（z-index: 1）の上、main-content（z-index: 99）の下
- 3D背景が透けつつ、テキストが前面に表示される
- `pointer-events: none` でスクロール以外の操作を透過

### 3-2. 通信方式

| イベント名 | 方向 | Payload | 用途 |
|-----------|------|---------|------|
| `story:progress` | Story.astro → ThreeModel | `{ progress: number, activeBlock: number }` | スクロール進捗とアクティブブロック番号を伝達 |

- `progress`: 0.0（Story 先頭）〜 1.0（Story 末尾）
- `activeBlock`: 現在表示中のブロック番号（-1 = なし）

### 3-3. スクロール再マッピング

Story 追加でページ全体のスクロール距離が増えるため、既存のスクロール連動ロジックに影響が出る。
`adjustedProgress` MotionValue で Story 区間を除外し、既存ロジック（城回転・ライティング・星空等）の入力値を正規化。

```
scrollYProgress (0〜1, ページ全体)
  ↓ useTransform
adjustedProgress:
  - Story 区間以前 → 0
  - main-content 以降 → 0〜1 に再マッピング
```

`storyEndRef` は `main-content` の `offsetTop / scrollable` で算出し、`resize` / `load` で再計算。

---

## 4. テキスト表示制御

### BLOCK_TIMINGS

Story 内のスクロール進捗（0〜1）に対する各ブロックの表示区間:

| エントリ | start | peak | end | 要素 |
|---------|-------|------|-----|------|
| 0 | 0.00 | 0.03 | 0.10 | heading |
| 1 | 0.14 | 0.19 | 0.27 | block 0 |
| 2 | 0.26 | 0.31 | 0.39 | block 1 |
| 3 | 0.38 | 0.43 | 0.51 | block 2 |
| 4 | 0.50 | 0.55 | 0.63 | block 3 |
| 5 | 0.62 | 0.67 | 0.76 | block 4 |
| 6 | 0.75 | 0.81 | 0.95 | block 5（最後は長め） |

- `start → peak`: フェードイン（opacity 0 → 1）
- `peak → end - 0.05`: フル表示（opacity 1）
- `end - 0.05 → end`: フェードアウト（opacity 1 → 0）
- heading のフェードアウトは `end → end + 0.1` の別計算

### タイミング調整ガイド

- 表示時間を長くしたい → `end` を大きく
- フェードインを速くしたい → `start` と `peak` の差を小さく
- 重なりを防ぐ → 前のブロックの `end` < 次のブロックの `start + 0.04` 程度
- 全体のスクロール量が足りなくなったら `.story { height }` を増やす

---

## 5. 3D 連動

### 5-1. カメラパス（StoryCamera コンポーネント）

`CatmullRomCurve3` で城を一周するパス（7制御点）:

```
始点/終点: [0, 0.5, 3]  — 正面（CameraReveal の到達点と一致）
→ 右前方 → 右側面 → 背面 → 左後方 → 左前方 → 正面に戻る
```

- `lerp(0.08)` で滑らかに追従
- 注視点: `[0, -0.2, 0]`（モデルオフセット考慮）
- `phase === 'ready'` かつ `isInStoryRef.current === true` の時のみ動作

### 5-2. OrbitControls（OrbitControlsManager コンポーネント）

`useFrame` 内で `controlsRef.current.enabled` を直接制御:
- Story 区間中: 無効化
- Story 離脱後: 有効化

### 5-3. MouseParallax

`isInStoryRef` を props で受け取り、Story 区間中は `useFrame` を早期 return。

### 5-4. テキスト連動エフェクト

SceneLighting の `useFrame` 末尾で、Story 区間中に追加エフェクトを適用:

| Block | エフェクト |
|-------|----------|
| 1 | シアン発光 intensity × 1.4 |
| 3 | シアン × 1.3 + ambient にシアン色味を加算 |
| 4 | sin ベースの発光バースト |

SkillCrystal:
- `storyActiveBlockRef` を props で受け取り
- Block 2 の時に emissiveIntensity × 2.0

---

## 6. ファイル構成

| ファイル | 役割 |
|---------|------|
| `src/components/Layouts/Story.astro` | HTML + スクロール制御スクリプト + スコープ付き CSS |
| `src/pages/index.astro` | Story の import と配置（MainVisual と main-content の間） |
| `src/components/ThreeModel/index.tsx` | adjustedProgress, StoryCamera, OrbitControlsManager, SceneLighting エフェクト |
| `src/components/ThreeModel/SkillCrystal.tsx` | storyActiveBlockRef prop + Block 2 emissive boost |

---

## 7. レスポンシブ

| | PC | モバイル (768px 以下) |
|---|---|---|
| スクロール量 | 420vh | 480vh |
| テキスト幅 | max-width: 540px | max-width: 90vw |
| 背景ぼかし | rgba(0,0,0,0.5) | rgba(0,0,0,0.6) |

---

## 8. 注意事項

- **Stylus 制約**: Story.astro のスタイルは素の CSS（Astro スコープ付き）で記述。Stylus の `:` / `/` 問題を回避
- **Lenis 互換**: `getBoundingClientRect()` ベースの計算なので Lenis の影響を自動反映
- **storyEndRef 精度**: 画像の遅延読み込みでレイアウトがずれる可能性あり。必要に応じて `ResizeObserver` 追加を検討
- **カメラパス座標**: 現在の値は初期値。城にめり込まないか、モバイルで城がフレームアウトしないか等の調整が必要な場合あり
