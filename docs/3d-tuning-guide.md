# 3Dシーン調整ガイド

> 対象ファイル: `src/components/ThreeModel/index.tsx`, `SkillCrystal.tsx`
> 最終更新: 2026-02-24

天空の城（floating-castle.glb）の表示を調整するためのリファレンス。

---

## 目次

1. [カメラ](#1-カメラ)
2. [ライティング（時間変化あり）](#2-ライティング時間変化あり)
3. [モデル位置・スケール](#3-モデル位置スケール)
4. [浮遊アニメーション（Float）](#4-浮遊アニメーションfloat)
5. [浮遊破片](#5-浮遊破片)
6. [スクロール連動](#6-スクロール連動)
7. [マウス追従パララックス](#7-マウス追従パララックス)
8. [シアン脈動](#8-シアン脈動)
9. [霧・モヤ演出](#9-霧モヤ演出)
10. [パーティクル（光の粒）](#10-パーティクル光の粒)
11. [星空背景](#11-星空背景)
12. [レンダラー設定](#12-レンダラー設定)
13. [ローディング画面・オープニング演出](#13-ローディング画面オープニング演出)
14. [トラブルシューティング](#14-トラブルシューティング)

---

## 1. カメラ

```tsx
<Canvas camera={{ position: [0, 0.5, 10], fov: 45 }}>
```

| パラメータ | 現在値 | 説明 |
|---|---|---|
| `position[0]` (X) | `0` | 左右（マイナス=左、プラス=右） |
| `position[1]` (Y) | `0.5` | 上下（マイナス=下、プラス=上） |
| `position[2]` (Z) | `10` | 前後（小さい=近い、大きい=遠い） |
| `fov` | `45` | 画角（小さい=望遠、大きい=広角） |

### ズーム制限（OrbitControls）

```tsx
<OrbitControls
  enableZoom={true}
  minDistance={3}   // これ以上近づけない
  maxDistance={3}   // これ以上遠ざけない
/>
```

> **Tips:** `minDistance === maxDistance` にするとズーム固定になる。

### カメラ位置のデバッグ

`OrbitControls` の `onChange` 内にある `console.log` のコメントを外すと、ブラウザDevToolsにカメラ座標がリアルタイム表示される。

---

## 2. ライティング（時間変化あり）

3灯構成。`SceneLighting` コンポーネントでスクロールに応じて自動的に色・強さが変化する。

### ライティング基準値

TIME_CONFIG のカーブ形状を維持したまま、全体の明るさを一括スケールする乗数。

```tsx
const AMBIENT_BASE = 15.0;  // 環境光 — 上げると全体が明るく
const DIR_BASE     = 3.0;   // 太陽光 — 上げると陰影コントラスト強く
const CYAN_BASE    = 1.0;   // シアン発光 — 上げると夜間グロウ強く
```

最終値 = `BASE × TIME_CONFIG値 × リアルタイム時間帯補正`

- **城が暗い** → `AMBIENT_BASE` を上げる（環境光の底上げ）
- **立体感がほしい** → `DIR_BASE` を上げる（方向光で陰影強調）
- **シアン発光を強く** → `CYAN_BASE` を上げる

### 時間変化テーブル（TIME_CONFIG）

```tsx
const TIME_CONFIG = [
  { at: 0.00, ambient: '#fff5e0', intensity: 0.8,  dirIntensity: 2.0, cyanIntensity: 3  },  // 朝
  { at: 0.25, ambient: '#ffffff', intensity: 1.0,  dirIntensity: 2.5, cyanIntensity: 3  },  // 昼
  { at: 0.50, ambient: '#ff8c42', intensity: 0.7,  dirIntensity: 1.5, cyanIntensity: 5  },  // 夕方
  { at: 0.75, ambient: '#1a1a3e', intensity: 0.3,  dirIntensity: 0.5, cyanIntensity: 8  },  // 夜
  { at: 1.00, ambient: '#0a0a1a', intensity: 0.15, dirIntensity: 0.2, cyanIntensity: 12 },  // 深夜
];
```

| スクロール | 時間帯 | 環境光の色 | 環境光の強さ | 方向光 | シアン発光 |
|---|---|---|---|---|---|
| 0%（トップ） | 朝 | `#fff5e0`（暖かい白） | 0.8 | 2.0 | 3 |
| 25% | 昼 | `#ffffff`（白） | 1.0 | 2.5 | 3 |
| 50% | 夕方 | `#ff8c42`（オレンジ） | 0.7 | 1.5 | 5 |
| 75% | 夜 | `#1a1a3e`（ネイビー） | 0.3 | 0.5 | 8 |
| 100% | 深夜 | `#0a0a1a`（ほぼ黒） | 0.15 | 0.2 | 12 |

各タイムポイント間は `lerp`（線形補間）でなめらかに遷移する。

#### 調整方法

- **朝をもっと明るく** → `at: 0.00` の `intensity` を上げる
- **夕方のオレンジを強く** → `at: 0.50` の `ambient` をより赤い色に
- **夜のシアンをもっと強調** → `at: 0.75` の `cyanIntensity` を上げる
- **時間帯の切り替わりポイント変更** → `at` の値を変更（0〜1の範囲）

### 2-1. 環境光（ambientLight）

初期値は `intensity: 0.5, color: #e8f4ff` だが、スクロールで TIME_CONFIG に従い自動変更される。

- **全体が暗い** → TIME_CONFIG の `intensity` を上げる
- **温かみを出したい** → `ambient` の色をより暖色に

### 2-2. 方向光（directionalLight）

```tsx
<directionalLight position={[5, 8, 3]} intensity={2} color="#ffffff" />
```

| パラメータ | 初期値 | 説明 |
|---|---|---|
| `position` | `[5, 8, 3]` | 光源の位置（太陽の方向）※ 固定 |
| `intensity` | `2` | 初期値。スクロールで `dirIntensity` に変化 |
| `color` | `#ffffff` | 光の色 ※ 固定 |

### 2-3. ポイントライト（シアン発光）

```tsx
<pointLight position={[0, -0.55, 0]} color="#00e5ff" intensity={3} distance={3} decay={2} />
```

| パラメータ | 値 | 説明 |
|---|---|---|
| `position` | `[0, -0.55, 0]` | 岩盤底面 |
| `color` | `#00e5ff` | シアン ※ 固定 |
| `intensity` | `3` | 初期値。スクロールで `cyanIntensity` に変化 + 脈動 |
| `distance` | `3` | 光が届く範囲 |
| `decay` | `2` | 減衰率 |

---

## 3. モデル位置・スケール

### Y軸オフセット

```tsx
<group position={[0, -1, 0]}>
```

| 値 | 結果 |
|---|---|
| `[0, 0, 0]` | 原点（中央） |
| `[0, -1, 0]` | 下に1ユニット（現在値） |
| `[0, -2, 0]` | さらに下 |
| `[0, 1, 0]` | 上に移動 |

### 岩盤・城の描画方式

```tsx
<primitive object={nodes.Rock_Base} />
<primitive object={nodes.Castle} />
```

`<primitive>` を使うことでGLB内の元のトランスフォーム（位置・回転・スケール）がそのまま保持される。`geometry` + `material` 方式だと元のトランスフォームが失われるので注意。

---

## 4. 浮遊アニメーション（Float）

```tsx
<Float
  speed={1}
  rotationIntensity={0.5}
  floatIntensity={0.5}
  floatingRange={[-0.1, 0.5]}
>
```

| パラメータ | 現在値 | 説明 |
|---|---|---|
| `speed` | `1` | アニメーション速度（大きい=速い） |
| `rotationIntensity` | `0.5` | 揺れの回転量（0=回転なし） |
| `floatIntensity` | `0.5` | 上下の浮遊量（0=浮遊なし） |
| `floatingRange` | `[-0.1, 0.5]` | 浮遊のY範囲（下限, 上限） |

> **Float は城全体（岩盤+城+破片）に適用される。** 個別の破片アニメーションは `useFrame` で別途制御。

---

## 5. スキルの結晶（衛星軌道周回）

> **対象ファイル**: `src/components/ThreeModel/SkillCrystal.tsx`

5つのスキルクリスタルが城の周囲を**常に等間隔（72°間隔）**で衛星のように周回する。各クリスタルは異なる傾斜軌道を持つ。

### 5-1. 等間隔軌道と共通速度

全クリスタルは `SHARED_ORBIT_SPEED`（共通角速度）で周回し、初期位相を `index × (360°/5)` で自動設定することで等間隔を保証する。

```tsx
// SkillCrystal.tsx
export const SHARED_ORBIT_SPEED = 0.10 // rad/s — 全クリスタル共通
const angleRef = useRef(index * (2 * Math.PI / N)) // 等間隔の初期位相
```

- **全体の周回速度を変えたい** → `SHARED_ORBIT_SPEED` を変更（0.05〜0.20 が自然な範囲）
- **等間隔は自動維持** — 個別に `phase` を調整する必要なし

### 5-2. 軌道パラメータ（OrbitParams）

```tsx
orbit: {
  radius: number,   // XZ平面の軌道半径
  height: number,   // 基準Y座標
  speed: number,    // （後方互換用・実際はSHARED_ORBIT_SPEEDを使用）
  phase: number,    // （後方互換用・実際はindex自動算出）
  tilt: number,     // 軌道面の傾斜角 (度)
  tiltDir: number,  // 傾斜方向 (度)
}
```

| Crystal | radius | height | tilt | tiltDir |
|---------|--------|--------|------|---------|
| Markup | 1.2 | 0.10 | 12° | 0° |
| AI | 1.3 | 0.20 | 18° | 120° |
| CMS/FW | 1.1 | 0.00 | 15° | 240° |
| DB/Infra | 1.4 | 0.30 | 22° | 60° |
| Design | 1.5 | -0.10 | 10° | 180° |

#### 調整方法

- **軌道を広げたい** → `radius` を大きくする
- **傾斜をつけたい** → `tilt` を大きくする（22°以上は城と重なるリスク）
- **高さを変えたい** → `height` で上下位置を調整

### 5-3. クリック時の停止/再開（全体同期）

クリスタルクリック（またはMainVisualのスキルボタン）で `activeCrystalId` が切り替わる。
**いずれかのクリスタルがアクティブになると、全クリスタルが一斉に減速停止**し、等間隔を維持する。

```tsx
// anyActive: activeCrystalId !== null（親から渡される）
const targetVelocity = anyActive ? 0 : SHARED_ORBIT_SPEED;
velocityRef.current += (targetVelocity - velocityRef.current) * 0.05;
```

- **停止を速くしたい** → `0.05` を大きく（例: `0.1`）
- **停止をゆっくり** → `0.05` を小さく（例: `0.02`）

### 5-3. 浮遊・自転・発光

軌道周回に加えて以下のアニメーションが重なる:

| パラメータ | 値 | 説明 |
|---|---|---|
| 浮遊 `sin(t * 0.8) * 0.03` | 振幅 0.03 | Y座標の微小な上下 |
| 自転 `+= 0.002` | 速度 0.002 | 偶数=時計回り、奇数=反時計回り |
| 発光 `emissiveBase + sin(t * 1.5) * 1.8` | 振幅 1.8 | active時は ×2.0 |
| スケール | 通常 0.12 / active 0.14 | クリック時に少し大きく |

---

## 5b. 塔上クリスタル（castle-crystal.glb）

城の左右の塔の上に配置されたクリスタル。スクロール連動で発光し、Bloom でグロウする。

### 配置位置

```tsx
// CastleCrystals コンポーネント内（index.tsx）
const POSITIONS: [number, number, number][] = [
  [-0.74, 0.14, 0.04],  // 左塔
  [0.738, 0.12, 0.02],  // 右塔
];
```

### スクロール連動発光

```tsx
// emissive: 1.5（朝・常時グロウ）→ 3.5（深夜・強烈）
const scrollBase = 1.5 + scroll * 2.0;
const pulse = Math.sin(t * 1.2) * 0.3 + 1; // シアン pointLight と同リズム
const emissiveIntensity = scrollBase * pulse;
```

| スクロール | emissiveIntensity（脈動中央値） | グロウ |
|-----------|-------------------------------|--------|
| 0%（朝） | 1.5 | あり（常時） |
| 50%（夕） | 2.5 | しっかり |
| 100%（深夜） | 3.5 | 強烈 |

### 回転・浮遊

| パラメータ | 値 | 説明 |
|---|---|---|
| 回転 `+= 0.005` | 速度 0.005/frame | ゆっくり自転 |
| 浮遊 `sin(t * 0.8) * 0.003` | 振幅 0.003 | 微小な上下（2つ目はフェーズ 1.5 ずれ） |

### GLB 構造

- マテリアル: `Mat_Crystal.001`（emissiveFactor: `[0, 0.898, 1.0]` = シアン）
- ジオメトリの頂点がワールド座標に焼き込まれているため、`GEO_OFFSET` で原点センタリングしてから配置

---

## 6. スクロール連動

### 6-1. 城全体の回転

```tsx
const rotationY = useTransform(scrollYProgress, [0, 1], [0, Math.PI * 0.8]);
```

| パラメータ | 説明 |
|---|---|
| `[0, 1]` | スクロール範囲（0%〜100%） |
| `[0, Math.PI * 0.8]` | 回転範囲（0〜約144度） |

- **もっと回したい** → `Math.PI * 0.8` を大きく（`Math.PI` で180度、`Math.PI * 2` で360度）
- **回転を減らす** → 値を小さく（`Math.PI * 0.3` 等）

### 6-2. 破片のスクロール連動

useFrame 内で `scrollRef.current`（0〜1）を使って制御:

- **外側に広がる**: `const spread = 1 + scroll * 1.5` → X/Z座標を乗算
- **下に沈む**: `- scroll * 0.5` → Y座標を減算
- **自転加速**: `0.03 + scroll * 0.05` → 回転速度を加算

### 6-3. ライティングの時間変化

→ [2. ライティング](#2-ライティング時間変化あり) の TIME_CONFIG を参照

---

## 7. マウス追従パララックス

`MouseParallax` コンポーネントで、マウス位置に応じてカメラが微妙に動く。

```tsx
// マウス位置 → カメラオフセット
const targetX = basePos.x + mouse.x * 0.8;   // 左右の追従量
const targetY = basePos.y - mouse.y * 0.4;   // 上下の追従量

// なめらかに追従（lerp）
camera.position.x += (targetX - camera.position.x) * 0.05;  // 追従の速さ
```

| パラメータ | 現在値 | 説明 |
|---|---|---|
| `mouse.x * 0.8` | `0.8` | 左右の移動量（大きい=大きく動く） |
| `mouse.y * 0.4` | `0.4` | 上下の移動量（大きい=大きく動く） |
| `* 0.05` | `0.05` | 追従の滑らかさ（小さい=ゆっくり追従、大きい=即追従） |

- **動きを控えめに** → `0.8` / `0.4` を小さく（例: `0.3` / `0.15`）
- **もっとダイナミックに** → 値を大きく（例: `1.5` / `0.8`）
- **追従を速く** → `0.05` を大きく（例: `0.1`）

> **注意:** OrbitControls と併用しているため、ドラッグ操作時はOrbitControlsが優先される。

---

## 8. シアン脈動

`SceneLighting` コンポーネント内の `useFrame` で pointLight の intensity をゆっくり明滅させる。

```tsx
const pulse = Math.sin(clock.elapsedTime * 1.2) * 0.3 + 1; // 0.7〜1.3
cyanRef.current.intensity = time.cyanIntensity * pulse;
```

| パラメータ | 現在値 | 説明 |
|---|---|---|
| `* 1.2` | `1.2` | 脈動の速さ（大きい=速い） |
| `* 0.3` | `0.3` | 脈動の振幅（大きい=明暗差が大きい） |
| `+ 1` | `1` | 中心値（1 = 元の強さを中心に振れる） |

結果: intensity が `cyanIntensity × 0.7` 〜 `cyanIntensity × 1.3` の範囲で揺れる。

- **脈動をもっと目立たせたい** → `0.3` を大きく（例: `0.5` → 0.5〜1.5の範囲）
- **脈動を控えめに** → `0.3` を小さく（例: `0.1` → 0.9〜1.1の範囲）
- **脈動を止めたい** → `pulse` を `1` に固定

---

## 9. 霧・モヤ演出

zwei `<Cloud>` コンポーネントで城の周囲にラピュタ風のモヤを表示。2層構成。

### 下層の霧（メイン）

```tsx
<Cloud
  position={[0, -0.5, 0]}
  opacity={0.15}
  speed={0.2}
  bounds={[4, 1, 1.5]}
  segments={12}
  color="#b0e8ff"
/>
```

### 上層の霧（アクセント）

```tsx
<Cloud
  position={[1, 0.3, -1]}
  opacity={0.1}
  speed={0.15}
  bounds={[3, 1, 1]}
  segments={8}
  color="#e0f0ff"
/>
```

| パラメータ | 説明 |
|---|---|
| `position` | 霧の中心位置 |
| `opacity` | 不透明度（小さい=薄い） |
| `speed` | 霧の動く速さ |
| `bounds` | 霧の広がり `[幅X, 高さY, 奥行Z]` |
| `segments` | 霧を構成するパーツ数（多い=密度UP、負荷UP） |
| `color` | 霧の色 |

- **霧を濃くしたい** → `opacity` を上げる（0.15→0.3）
- **霧を広げたい** → `bounds` を大きくする
- **霧の層を増やしたい** → `<Cloud>` をもう1つ追加

---

## 10. パーティクル（光の粒）

drei `<Sparkles>` で城の周囲にキラキラした粒子を漂わせる。

`ScrollSparkles` コンポーネントで、スクロール速度に応じて opacity が変化する。

```tsx
<Sparkles
  count={300}
  scale={10}
  size={6}
  speed={0.4}
  opacity={0.5}
  color="#00e5ff"
/>
```

| パラメータ | 現在値 | 説明 |
|---|---|---|
| `count` | `300` | 粒子の数 |
| `scale` | `10` | 粒子が飛ぶ範囲の大きさ |
| `size` | `6` | 各粒子の大きさ |
| `speed` | `0.4` | 粒子の動く速さ |
| `opacity` | `0.5` | 基本の不透明度 |
| `color` | `#00e5ff` | 粒子の色（シアン） |

### スクロール速度連動

スクロール速度（前フレームとの差分 × 100）に応じて opacity が `0.05`（静止時）〜 `1.0`（高速スクロール時）に変化する。

```tsx
const rawVelocity = Math.abs(scrollRef.current - prevScroll.current) * 100;
velocityRef.current += (rawVelocity - velocityRef.current) * 0.1;  // なめらかに追従
const opacity = Math.min(1.0, 0.05 + velocityRef.current * 3);     // 速度→不透明度
```

- **粒子を増やしたい** → `count` を上げる（パフォーマンスに注意）
- **粒子を目立たせたい** → `size` や `opacity` を上げる
- **静止時にもっと見えるように** → `0.05` を大きく（例: `0.2`）
- **速度感度を調整** → `* 3` の値を変更（大きい=敏感、小さい=鈍い）

---

## 11. 星空背景

drei `<Stars>` + スクロール連動で、夜になると星が浮かび上がる。

```tsx
<Stars
  radius={50}
  depth={30}
  count={3000}
  factor={3}
  saturation={0.2}
  fade
  speed={0.5}
/>
```

| パラメータ | 現在値 | 説明 |
|---|---|---|
| `radius` | `50` | 星空の球体の半径 |
| `depth` | `30` | 星の奥行き |
| `count` | `3000` | 星の数 |
| `factor` | `3` | 星の大きさの倍率 |
| `saturation` | `0.2` | 色の彩度（0=白、1=カラフル） |
| `fade` | `true` | 遠い星がフェードアウト |
| `speed` | `0.5` | 星のキラキラ速度 |

### スクロール連動の表示制御

`NightSky` コンポーネント内の `useFrame` で `visible` プロパティを制御:

```tsx
// スクロール40%以降で表示（Stars はカスタムシェーダーのため opacity 制御不可）
starsRef.current.visible = scrollRef.current > 0.4;
```

| スクロール | 星空の状態 |
|---|---|
| 0%〜40% | 非表示 |
| 40%〜100% | 表示 |

> **注意:** `<Stars>` はカスタムシェーダーを使用しているため、`material.opacity` による制御は効かない。`visible` プロパティで ON/OFF 制御する。

- **もっと早く星を出したい** → `0.4` を `0.3` に変更
- **星の数を増やしたい** → `count` を上げる（例: 5000）
- **星を大きくしたい** → `factor` を上げる

---

## 12. レンダラー設定

```tsx
gl={{
  toneMapping: THREE.ACESFilmicToneMapping,
  outputColorSpace: THREE.SRGBColorSpace,
}}
```

| 設定 | 値 | 説明 |
|---|---|---|
| `toneMapping` | `ACESFilmicToneMapping` | HDR→LDR変換（映画的なトーン。白飛び防止に有効） |
| `outputColorSpace` | `SRGBColorSpace` | 色空間（sRGBで正しい色再現） |

### emissive リセット

```tsx
React.useEffect(() => {
  Object.values(materials).forEach((mat) => {
    const m = mat as THREE.MeshStandardMaterial;
    m.emissive.set('#000000');
    m.emissiveIntensity = 0;
    m.needsUpdate = true;
  });
}, [materials]);
```

GLBインポート時にマテリアルの emissive がデフォルト値になっている場合、意図しない発光で白飛びする。このコードで emissive をリセットし、ライティングだけで明るさを制御する。

---

## 13. ローディング画面・オープニング演出

3Dモデルのロード中にグリッチ演出付きのローディング画面を表示し、ロード完了後にカメラ演出 → 霧が晴れる流れで3Dシーンを表示する。

### フェーズ管理（ThreeScene 側）

```tsx
const [phase, setPhase] = useState<'loading' | 'fog' | 'ready'>('loading');
```

| フェーズ | 表示状態 | 説明 |
|---|---|---|
| `loading` | グリッチローディング画面 + 霧オーバーレイ | 3Dモデル読み込み中 |
| `fog` | カメラ演出 + 霧オーバーレイ（フェードアウト中） | ロード完了。カメラが接近しながら霧が晴れる |
| `ready` | 3Dシーンのみ | 全演出完了。OrbitControls + MouseParallax 有効化 |

### LoadingGlitch コンポーネント（`LoadingGlitch.tsx`）

drei の `useProgress` フックで Canvas 内のアセット読み込み進捗を取得。Canvas の**外**でHTML/CSS描画する。

```tsx
const { progress } = useProgress();
```

#### 演出フロー

```
[glitching] 0〜100%（3Dモデルロード中）
  「SP WEBCREAT.」テキストがグリッチエフェクト付きで表示
  → 進捗に応じてグリッチ強度が低下（1.0 → 0.0）
  → スキャンラインオーバーレイ
  → プログレスバー + カウントアップ（0% → 100%）

[clean] 100% 到達後 1秒
  グリッチ消失。テキストがクリーンに表示（シアン glow 強調）

[fading] 600ms
  CSS transition で opacity → 0 → onTransitionComplete コールバック
  → ThreeScene 側: phase='fog' → CameraReveal + 霧フェードアウト → phase='ready'
```

#### グリッチエフェクト仕様

| 要素 | 説明 |
|---|---|
| テキスト | HTML `<h1>` + Montserrat Bold。Canvas不使用のためフォント問題なし |
| `::before` | 赤色（#ff0040）レイヤー。`clip-path: inset()` + `transform` でちらつき |
| `::after` | シアン（#00e5ff）レイヤー。別タイミングのちらつき |
| `--glitch-intensity` | CSS変数。進捗 0%=1.0 → 100%=0.0。pseudo要素の `opacity` に適用 |
| スキャンライン | 2px間隔の水平線（`repeating-linear-gradient`）。進捗とともにフェードアウト |

#### z-index 構造

| 要素 | z-index | 説明 |
|---|---|---|
| `.loadingGlitch` | `200` | 黒背景 + グリッチテキスト + プログレス |
| `.fogOverlay` | `199` | 放射グラデーション霧（ローディング後にフェードアウト） |
| Canvas | `1` | 3Dシーン本体 |

### CameraReveal コンポーネント（`index.tsx` 内）

ローディング完了後のカメラ接近演出。Canvas 内で動作する。

```tsx
const CAMERA_START = new THREE.Vector3(3, 4, 16);  // 遠景・俯瞰
const CAMERA_END   = new THREE.Vector3(0, 0.5, 3);  // 最終位置（OrbitControls引き渡し）
```

| フェーズ | カメラ動作 |
|---|---|
| `loading` | `CAMERA_START` に固定。3Dシーンはロード中（遠景で見えている） |
| `fog` | `CAMERA_END` に向けて lerp（0.025）でスムーズにパン＆ズーム |
| `ready` | 到達完了 → OrbitControls + MouseParallax に引き渡し |

- OrbitControls は `enabled={phase === 'ready'}` で reveal 中は無効
- MouseParallax も `phase === 'ready'` でのみレンダリング

### タイミング調整

| パラメータ | 現在値 | 場所 | 説明 |
|---|---|---|---|
| グリッチ表示 | 0〜100%の間 | `LoadingGlitch.tsx` | ロード進捗に連動 |
| クリーン表示 | `1000ms` | `LoadingGlitch.tsx` `CLEAN_DURATION` | 完成テキストの停止表示時間 |
| フェードアウト | `600ms` | `LoadingGlitch.tsx` `FADE_DURATION` | CSS opacity transition |
| カメラ接近速度 | `0.025` | `index.tsx` `CameraReveal` | lerp factor（大きいほど速い） |
| 霧が晴れるまで | `2000ms` | `index.tsx` `handleLoadComplete` | `setPhase('fog')` → `setPhase('ready')` |
| 霧フェードアウト | `2s` | `index.module.styl` `.fogOverlay` | CSS `transition: opacity 2s` |
| テキスト出現イベント | `800ms` | `index.tsx` `handleLoadComplete` | `threemodel:reveal` 発火タイミング |

- **ローディングを早く終わらせたい** → `CLEAN_DURATION` / `FADE_DURATION` を短く
- **カメラ演出を速く** → lerp factor `0.025` を大きく（例: `0.05`）
- **霧演出を長く** → `2000ms` / CSS `2s` を大きく
- **霧の色を変えたい** → `.fogOverlay` の `background` グラデーションを変更

---

## 14. トラブルシューティング

### モデルが白飛びする

| 原因 | 対処 |
|---|---|
| ライトが強すぎる | TIME_CONFIG の `intensity` / `dirIntensity` を下げる |
| emissive が有効 | emissive リセットの useEffect が正しく動いているか確認 |
| toneMapping なし | `gl={{ toneMapping: THREE.ACESFilmicToneMapping }}` を設定 |

### モデルが近すぎる / 画面いっぱいになる

| 原因 | 対処 |
|---|---|
| カメラが近い | `position` の Z 値を大きくする（例: 10→15） |
| fov が大きすぎる | `fov` を小さくする（例: 45） |

### モデルが暗すぎる

| 原因 | 対処 |
|---|---|
| ライトが弱い | まず `AMBIENT_BASE` / `DIR_BASE` を上げる（カーブ全体をスケール） |
| 夜間の色が暗すぎる | TIME_CONFIG の `ambient` 色を明るめに変更（例: `#1a1a3e` → `#2a2a5e`） |
| directionalLight の方向 | `position` を調整して城に光が当たるようにする |

### 岩盤の位置がずれる

`<primitive object={nodes.Rock_Base} />` を使うこと。`<mesh geometry={...} material={...} />` だとGLBの元トランスフォームが失われる。

### クリスタルの軌道がおかしい / 城と重なる

`SkillCrystal.tsx` の `SKILL_CRYSTALS` 内の `orbit` パラメータを調整。
- `radius` を大きくして離す
- `tilt` を小さくして傾斜を減らす
- `height` で上下位置を調整

### マウスパララックスが効かない

OrbitControls がカメラ位置を上書きしている可能性がある。`enableRotate={false}` にするとパララックスのみになる。

---

## コンポーネント構成

```
ThreeScene (export default)
├── Canvas
│   ├── CameraReveal         ← ローディング後のカメラ パン&ズーム演出
│   ├── SceneLighting        ← 時間変化ライティング + シアン脈動
│   │   ├── ambientLight     ← スクロールで色・強さ変化
│   │   ├── directionalLight ← スクロールで強さ変化
│   │   └── pointLight       ← スクロールで強さ変化 + sin脈動
│   ├── NightSky             ← 星空（スクロール40%以降で visible）
│   │   └── Stars
│   ├── MouseParallax        ← マウス追従カメラ（phase=ready のみ）
│   ├── Cloud × 2            ← 霧・モヤ演出
│   ├── ScrollSparkles       ← パーティクル（スクロール速度連動）
│   │   └── Sparkles
│   ├── Float → Model        ← 城 + 結晶 + スケール演出アセット
│   │   ├── Castle（floating-castle-v5.glb）
│   │   ├── CastleCrystals（castle-crystal.glb × 2・塔上配置・スクロール発光）
│   │   ├── SkillCrystal × 5（等間隔衛星軌道周回）
│   │   ├── DroneScout（周回飛行）
│   │   ├── OrbitalRing（遠景半透明リング）
│   │   └── MechanicalBirds × 7（群れ飛行）
│   └── OrbitControls        ← ドラッグ操作（phase=ready のみ有効）
├── CrystalDetailPanel       ← スキル詳細パネル（下からスライドアップ）
├── LoadingGlitch            ← グリッチローディング画面（phase=loading のみ表示）
└── fogOverlay               ← 霧オーバーレイ（CSSフェードアウト）

MainVisual (Astro)
└── skillNav                 ← スキルボタン（CustomEvent で ThreeScene と連携）
    └── skillBtn × 5         ← crystal:activate / crystal:statechange
```

---

## 現在の実装値サマリー

```
カメラ初期:     position=[3, 4, 16]  fov=45  ← CameraReveal 開始位置
カメラ最終:     position=[0, 0.5, 3]  ← CameraReveal 到達 → OrbitControls引き渡し
ズーム制限:      min=3  max=3（固定）
モデルオフセット:  [0, -1, 0]

--- ライティング基準値（全体スケール）---
AMBIENT_BASE=15.0  DIR_BASE=3.0  CYAN_BASE=1.0

--- ライティング（初期値 / スクロールで TIME_CONFIG に変化 × 基準値）---
ambientLight:     intensity=0.8  color=#fff5e0  (朝)
directionalLight: intensity=2.0  position=[5, 8, 3]
pointLight:       intensity=3    color=#00e5ff  distance=3  decay=2

--- 時間変化 ---
朝(0%):   ambient=#fff5e0  環境=0.8  方向=2.0  シアン=3
昼(25%):  ambient=#ffffff  環境=1.0  方向=2.5  シアン=3
夕(50%):  ambient=#ff8c42  環境=0.7  方向=1.5  シアン=5
夜(75%):  ambient=#1a1a3e  環境=0.3  方向=0.5  シアン=8
深夜(100%): ambient=#0a0a1a 環境=0.15 方向=0.2  シアン=12

--- Float ---
speed=1  rotationIntensity=0.5  floatIntensity=0.5  range=[-0.1, 0.5]

--- 塔上クリスタル（castle-crystal.glb × 2）---
左塔=[-0.74, 0.14, 0.04]  右塔=[0.738, 0.12, 0.02]
emissive: 1.5 + scroll * 2.0（常時グロウ）  回転=0.005/frame  浮遊=0.003

--- スキルの結晶（等間隔衛星軌道周回）---
SHARED_ORBIT_SPEED=0.10 rad/s  等間隔=72°自動  radius=1.1〜1.5  tilt=10〜22°
停止/再開: anyActive で全体同期 lerp=0.05  浮遊振幅=0.03  自転=0.002
詳細パネル: 下からスライドアップ（PC/SP共通）max-height=50vh

--- スクロール回転 ---
0 → π*0.8 (約144度)

--- マウスパララックス ---
X移動量=0.8  Y移動量=0.4  追従速度=0.05

--- シアン脈動 ---
速さ=1.2  振幅=0.3  範囲=0.7〜1.3倍

--- 霧・モヤ ---
下層: position=[0,-0.5,0]  opacity=0.15  bounds=[4,1,1.5]  color=#b0e8ff
上層: position=[1,0.3,-1]  opacity=0.1   bounds=[3,1,1]    color=#e0f0ff

--- パーティクル（スクロール速度連動） ---
count=300  scale=10  size=6  speed=0.4  opacity=0.5  color=#00e5ff
静止時opacity=0.05  速度感度=×3

--- 星空 ---
radius=50  count=3000  factor=3  表示開始=scroll 40%以降（visible切替）

--- ローディング（グリッチ演出） ---
フェーズ: loading(glitching→clean→fading) → fog(カメラ演出) → ready
グリッチ強度: 進捗0%=1.0 → 100%=0.0（CSS変数 --glitch-intensity）
クリーン表示: 1000ms  フェードアウト: 600ms  霧晴れ: 2s
カメラ演出: [3,4,16] → [0,0.5,3] lerp=0.025
z-index: loadingGlitch=200  fogOverlay=199  canvas=1

--- レンダラー ---
toneMapping: ACESFilmicToneMapping
outputColorSpace: SRGBColorSpace
```
