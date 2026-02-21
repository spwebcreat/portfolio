# SP WEB CREAT. ポートフォリオ 3Dリニューアル計画 v2

> 最終更新: 2026-02-20
> ステータス: 3Dアセット完成 → R3F実装フェーズへ

---

## コンセプト

**「ダーク＆クール × ファンタジー天空の城」**

ラピュタのような廃墟感のある浮遊城が空に浮かんでいる。
崩れかけた尖塔や城壁の隙間からシアンの光が漏れ、
スクロールに連動して朝から夜へと時間が変化していく。
アクセスするたびに現在の天気が反映され、シーンの雰囲気が変わる。

「かつて栄えた文明の名残」のような大人のファンタジー。
FFに出てきそうな壮大なスケール感で、他のポートフォリオと差別化する。

---

## 現行サイトからの変更点

| | 現行（2年前） | リニューアル後 |
|---|---|---|
| 3Dモデル | 既存素材を探して採用（妥協あり） | AIで自分のイメージ通りに自作 |
| テイスト | ダーク＆クール（宇宙空間の岩の島） | ダーク＆クール＋ファンタジー（天空の城） |
| 背景 | 黒背景（宇宙） | 空（朝→夜のグラデーション変化） |
| 演出 | スクロール連動のカメラワーク | 時間変化＋天気API連動＋浮遊アニメーション |
| 差別化 | 3D表現があるポートフォリオ | 3D×ファンタジーで他と一線を画す |
| 目的 | 自己表現 | 自己表現＋クライアントへの3D技術アピール |

---

## 完了済み: 3Dアセット制作

### 制作ワークフロー（実績）

```
① Meshyで岩盤を生成（プロンプト: dark fantasy floating island rock base...）
② Meshyで城を3パターン生成（A/B/C比較 → Aを採用）
③ Meshyでテクスチャ＋PBRマップ生成
④ GLBダウンロード（Meshy有料プラン）
⑤ Blenderに読み込み → Blender MCPで配置・スケール調整
⑥ Blender MCPで色調補正（窓光をオレンジ→シアンに変更、全体のダーク＆クール統一）
⑦ Blender MCPでポリゴン削減（Decimate → 約23万ポリゴン）
⑧ Blender MCPで浮遊破片5個追加
⑨ Blender MCPで岩盤底面にシアン発光グラデーション追加
⑩ GLBエクスポート（Draco圧縮レベル6）
```

### 使用ツール

| ツール | 用途 | 備考 |
|---|---|---|
| Meshy AI（Meshy 6） | 3Dモデル＋テクスチャ生成 | 有料プラン課金済み（1000クレジット） |
| Blender 5.0.1 | モデル配置・調整・エクスポート | 無料 |
| Blender MCP | BlenderをClaude Desktopから自然言語で操作 | 無料（Claude Desktop経由） |

### 採用したMeshyプロンプト

**岩盤:**
```
dark fantasy floating island rock base,
broken crumbling bottom,
ancient stone,
mossy cracks,
dramatic lighting,
game asset style
```

**城（Aパターン・採用）:**
```
grand fantasy sky castle,
towering gothic spires,
flying buttresses,
floating stone bridges,
glowing crystal accents,
ornate architecture,
dark atmosphere,
epic scale,
game cinematic quality
```

---

## GLBファイル情報

| 項目 | 内容 |
|---|---|
| **ファイル名** | `floating-castle.glb` |
| **ファイルサイズ** | 9.88 MB |
| **総ポリゴン数** | 229,530 |
| **Draco圧縮** | ✅ レベル6 |
| **テクスチャ** | GLB内に埋め込み済み |
| **座標系** | Y-up（Web標準） |

### GLB内オブジェクト一覧

| ノード名 | 種別 | ポリゴン数 | 説明 |
|---|---|---|---|
| `Castle` | Mesh | 166,039 | ファンタジーの城・塔 |
| `Rock_Base` | Mesh | 63,391 | 浮遊島の岩盤 |
| `Rock_Fragment_01` | Mesh | 20 | 浮遊破片①（右前・岩盤上面付近） |
| `Rock_Fragment_02` | Mesh | 20 | 浮遊破片②（左後ろ・高め） |
| `Rock_Fragment_03` | Mesh | 20 | 浮遊破片③（後方左・岩盤中腹） |
| `Rock_Fragment_04` | Mesh | 20 | 浮遊破片④（右後ろ・城壁付近） |
| `Rock_Fragment_05` | Mesh | 20 | 浮遊破片⑤（真右・底面付近） |

> Mist_Volume（霧）はGLBに含めていない → R3F側で実装

### マテリアル一覧

| マテリアル名 | 適用オブジェクト | 内容 |
|---|---|---|
| `Mat_Castle` | Castle | Base Color / MetallicRoughness / NormalMap の3テクスチャ構成。シアン寒色補正済み。窓光をシアン（#00e5ff）に置換済み |
| `Mat_Rock` | Rock_Base, 全破片 | 同じく3テクスチャ構成。明度-28%・青み追加。底面にシアン発光グラデーション付き |

### Mat_Rock の底面発光ノード構成（参考）

```
Geometry（Position）
  → Separate XYZ（Z成分）
  → Map Range（Z=-0.419〜-0.254 → 1.0〜0.0）
  → Math Power（1.5乗・緩やかなカーブ）
  → Mix Shader（Fac）
      ├── Principled BSDF（通常マテリアル）
      └── Emission（#00e5ff / Strength=6.0）
```

---

## 次フェーズ: R3F実装

### 技術スタック

- **フレームワーク**: Astro.js
- **3D**: React Three Fiber + drei
- **スタイル**: TailwindCSS
- **言語**: TypeScript

### R3F 基本実装コード

```tsx
import { useGLTF } from '@react-three/drei'

// Draco デコーダーの設定（必須）
useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')

export function FloatingCastle() {
  const { nodes, materials } = useGLTF('/floating-castle.glb')

  return (
    <group>
      {/* 岩盤 */}
      <mesh
        geometry={nodes.Rock_Base.geometry}
        material={materials.Mat_Rock}
      />

      {/* 城 */}
      <mesh
        geometry={nodes.Castle.geometry}
        material={materials.Mat_Castle}
      />

      {/* 浮遊破片 */}
      {[1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={i}
          geometry={nodes[`Rock_Fragment_0${i}`].geometry}
          material={materials.Mat_Rock}
        />
      ))}
    </group>
  )
}

useGLTF.preload('/floating-castle.glb')
```

### ライティング設定

```tsx
{/* 環境光 */}
<ambientLight intensity={0.6} color="#e8f4ff" />

{/* 方向光（太陽光） */}
<directionalLight
  position={[5, 8, 3]}
  intensity={1.2}
  color="#ffffff"
  castShadow
/>

{/* 岩盤底面のシアン発光 */}
<pointLight
  position={[0, -0.55, 0]}
  color="#00e5ff"
  intensity={80}
  castShadow={false}
/>
```

### スクロール連動・時間変化

| スクロール位置 | 時間帯 | 演出 | セクション |
|---|---|---|---|
| 0%（トップ） | 朝 | 霧がかった幻想的な空。柔らかい光 | Hero / Title |
| 25% | 昼 | 明るい空。城の全体像が見える | About |
| 50% | 夕方 | オレンジ〜紫のグラデーション | Projects |
| 75% | 夜 | 暗い空。シアンの発光アクセントが際立つ | Works |
| 100% | 深夜 | 星空。静かな雰囲気 | Blog / Contact |

```tsx
const timeConfig = [
  { at: 0.00, ambient: '#fff5e0', intensity: 0.8, label: '朝' },
  { at: 0.25, ambient: '#ffffff', intensity: 1.0, label: '昼' },
  { at: 0.50, ambient: '#ff8c42', intensity: 0.7, label: '夕方' },
  { at: 0.75, ambient: '#1a1a3e', intensity: 0.3, label: '夜' },
  { at: 1.00, ambient: '#0a0a1a', intensity: 0.15, label: '深夜' },
]

// 夜になるほどシアン発光を強調
<pointLight
  position={[0, -0.55, 0]}
  color="#00e5ff"
  intensity={80 + scrollProgress * 120}
/>
```

### 霧・モヤ演出

```tsx
import { Cloud } from '@react-three/drei'

<Cloud
  position={[0, 0.42, 0]}
  opacity={0.25}
  speed={0.3}
  width={3}
  depth={1}
  segments={8}
  color="#b0e8ff"
/>
```

### 浮遊破片アニメーション

```tsx
const basePositions = {
  Rock_Fragment_01: [1.00,  0.10,  0.57],
  Rock_Fragment_02: [-1.00, 0.30,  0.84],
  Rock_Fragment_03: [-0.92, -0.10, -0.77],
  Rock_Fragment_04: [0.93,  0.50, -1.11],
  Rock_Fragment_05: [0.00, -0.25,  1.60],
}

useFrame(({ clock }) => {
  fragmentRefs.forEach((ref, i) => {
    if (!ref.current) return
    ref.current.position.y =
      basePositions[`Rock_Fragment_0${i+1}`][1] +
      Math.sin(clock.elapsedTime * 0.8 + i * 1.2) * 0.03
    ref.current.rotation.y += 0.003 * (i % 2 === 0 ? 1 : -1)
  })
})
```

### パフォーマンス注意点

| 項目 | 内容 |
|---|---|
| Draco デコード | 初回ロード時に処理発生。`useGLTF.preload()` で事前ロード推奨 |
| テクスチャ警告 | `More than one shader node tex image` の警告あり。動作に問題なし |
| Shadow | 破片・PointLightは `castShadow={false}` 推奨 |
| LOD | 必要に応じて遠景用低ポリゴン版をBlenderで別途作成 |

---

## 将来の拡張機能

### 天気API連動

OpenWeatherMap API（無料枠）で現在地の天気を取得し、シーンに反映。

| 天気 | 演出 |
|---|---|
| 晴れ | 明るい空、雲少なめ、光のアクセント強め |
| 曇り | 雲多め、全体的にグレイッシュ |
| 雨 | パーティクルで雨粒、雲が暗く低い |
| 雷 | 白フラッシュ＋画面揺れ、PointLightフリッカー |
| 雪 | 白いパーティクルがゆっくり降る |

### 3Dビューワーサンプルページ（営業ツール）

ポートフォリオとは別ページで、プロダクトをグリグリ回せるデモを用意。
クライアントに「御社のサイトにもこういうのできますよ」と見せる用。

### ブログ記事

「2年前に素材を探して妥協しながら作ったもの」vs
「AIツール（Meshy + Blender MCP）で自分のイメージを直接形にしたもの」
→ 制作過程のビフォーアフター記事

---

## Blenderシーン構成メモ（参考）

```
Scene
├── Castle          ← Mat_Castle（シアン寒色補正・窓光置換済み）
├── Rock_Base       ← Mat_Rock（明度Down・青み・底面シアン発光）
├── Rock_Fragment_01〜05  ← Mat_Rock 流用
├── CyanGlow_Light  ← PointLight #00e5ff / Energy=80（GLB非含有）
├── Mist_Volume     ← Principled Volume（GLB非含有・R3F側で再現）
├── Light           ← デフォルトライト
└── Camera          ← デフォルトカメラ
```

---

*作成日: 2026-02-20 / Blender 5.0.1 / Meshy AI (Meshy 6) / Blender MCP*
