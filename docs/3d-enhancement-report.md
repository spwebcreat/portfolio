# 3D強化プロジェクト 完了レポート

> 2026-02-20 〜 2026-02-22 実施

## 概要

ポートフォリオサイト（sp-webcreat.pro）の3Dビジュアルを大幅強化。
AI生成ツール + Blender最適化 + R3F実装の一貫パイプラインで、
天空の城シーンに10個の3Dアセットを追加した。

## 制作パイプライン

Nano Banana Pro（概念画像生成）→ Meshy AI（3Dモデル生成）→ Blender MCP（最適化）→ R3F（Web実装）

## 完了したフェーズ

### Phase 1: スキルの結晶（5つ）

城の周囲に浮遊する5つの結晶。各スキル領域を象徴するオブジェクト。
ホバーでスキル詳細がポップアップする。

| アセット | ファイル | サイズ |
|---------|---------|--------|
| コードの石碑 | crystal-code-tablet.glb | 764KB |
| AIコアキューブ | crystal-ai-cube.glb | 771KB |
| 歯車×自然の融合体 | crystal-gear-nature.glb | 1.14MB |
| データベース結晶 | crystal-database.glb | 998KB |
| ホログラムディスク | crystal-hologram-disc.glb | 576KB |

### Phase 3: スケール感演出アセット

城に「生きている世界」の感覚を与える小さなアセット群。

| アセット | ファイル | サイズ | 備考 |
|---------|---------|--------|------|
| 偵察ドローン | drone-scout.glb | 330KB | 城の周囲を周回飛行 |
| 巨大リング | orbital-ring.glb | 262KB | 遠景に半透明で浮遊 |
| ~~ローブの旅人~~ | ~~tiny-wanderer.glb~~ | ~~173KB~~ | **シーンから削除済み** |
| 機械の鳥 | mechanical-bird.glb | 268KB | 7羽の群れで飛行 |

## 技術的な知見

### テクスチャ圧縮の効果
- 旅人: 12.3MB → 173KB（98.6%削減）、72チャンネル歩行アニメーション維持
- 手法: テクスチャを2048→256にリサイズ + Draco圧縮レベル6
- 極小表示アセットは256×256テクスチャで視覚的に十分

### Meshy AI + Blender最適化のベストプラクティス
- 複雑なモデル（離散ジオメトリ）: Meshy remesh > Blender Decimate
- アニメーション付きモデル: Decimate はウェイト破壊のリスクあり、テクスチャ圧縮を優先
- GLBエクスポート: Draco圧縮レベル6、テクスチャ埋め込み、カメラ/ライト除外

### スコープ調整の判断
- 機械の鳥の羽ばたきアニメーション: 技術的制約 + 極小表示のため**スキップが正解**
- アニメーションの要否は表示サイズで判断（旅人の杖の光 = 必要、鳥の翼 = 不要）

## 共通仕様

- アクセントカラー: #00e5ff（シアン）— 全アセットのEmission統一色
- GLBフォーマット: Draco圧縮レベル6、Y-up座標系
- Dracoデコーダー: https://www.gstatic.com/draco/versioned/decoders/1.5.6/

## GLBファイル一覧（public/models/）

| ファイル | サイズ | 状態 |
|---------|--------|------|
| floating-castle.glb | 4.82MB | 実装済み（城+岩盤メイン） |
| crystal-*.glb × 5 | 764KB〜1.14MB | 実装済み |
| drone-scout.glb | 330KB | 実装済み |
| orbital-ring.glb | 262KB | 実装済み |
| tiny-wanderer.glb | 173KB | シーンから削除済み（アセットファイルは残存） |
| mechanical-bird.glb | 268KB | 実装済み |

## 後続アップデート（2026-02-23）

### スキルクリスタル: 衛星軌道周回化
- 固定配置（position）→ 衛星軌道周回（orbit パラメータ）に変更
- 各クリスタルが異なる半径・速度・傾斜角で城を周回
- クリック時にスムーズ減速 → 停止、閉じるとスムーズ加速 → 再開

### 詳細パネルUI統一
- PC: 右からスライドイン → **下からスライドアップに変更**
- SP と共通のUI（`max-height: 50vh`, `border-radius: 16px 16px 0 0`）

### MainVisual スキルボタン追加
- `src/components/MainVisual/index.astro` にスキルクリスタル発動ボタンを追加
- `CustomEvent`（`crystal:activate` / `crystal:statechange`）で ThreeScene と双方向連携
- スマホでも3D空間をタップせずにスキル詳細を開ける

### TinyWanderer 削除
- ローブの旅人（tiny-wanderer.glb）をシーンから削除
- `index.tsx` から import と `<TinyWanderer>` を除去
- `ScaleAssets.tsx` の export 定義とアセットファイルは残存

### ローディング画面リニューアル + カメラ演出追加（2026-02-24）

旧 LoadingScreen（SVGリプル + プログレスバー + "LOADING" テキスト）を廃止し、
グリッチ演出付きローディング + カメラ パン&ズームに置き換え。

#### LoadingGlitch（`LoadingGlitch.tsx`）
- **演出**: 「SP WEBCREAT.」テキストがグリッチエフェクト（clip-path + transform）付きで表示
- **進捗連動**: グリッチ強度が進捗に連動（0%=強 → 100%=消失）
- **スキャンライン**: 2px間隔の水平線オーバーレイ
- **カウントアップ**: 0% → 100% のスムーズなプログレス表示
- **HTML/CSS ベース**: Canvas パーティクルでのテキスト形成を試みたが、フォントローディングの
  タイミング問題（Google Fonts の @font-face 未パース時にフォールバックフォントで描画される）
  が解決困難だったため、HTML テキスト + CSS アニメーションに方針転換

#### CameraReveal（`index.tsx` 内）
- **カメラ開始位置**: `[3, 4, 16]`（遠景・俯瞰）
- **カメラ最終位置**: `[0, 0.5, 3]`（OrbitControls 引き渡し地点）
- **演出**: fog フェーズで lerp によるスムーズなパン&ズーム
- OrbitControls / MouseParallax は `phase=ready` まで無効化

## 未着手タスク

→ `docs/r3f-knowledge.md` のロードマップを参照
