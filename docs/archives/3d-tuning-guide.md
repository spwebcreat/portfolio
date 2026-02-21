# 3Dシーン調整ガイド

> 対象ファイル: `src/components/ThreeModel/index.tsx`
> 最終更新: 2026-02-21

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

## 5. 浮遊破片

### 5-1. 初期位置

```tsx
const FRAGMENT_BASE = [
  { key: 'Rock_Fragment_01', pos: [1.00,  0.10,  0.57] },
  { key: 'Rock_Fragment_02', pos: [-1.00, 0.30,  0.84] },
  { key: 'Rock_Fragment_03', pos: [-0.92, -0.10, -0.77] },
  { key: 'Rock_Fragment_04', pos: [0.93,  0.50, -1.11] },
  { key: 'Rock_Fragment_05', pos: [0.00, -0.25,  1.60] },
];
```

`pos` の値を変えると破片の初期配置が変わる。

### 5-2. サイズ

```tsx
scale={0.01 * i + 0.05}
```

| 破片 | i | scale | 結果 |
|---|---|---|---|
| Fragment_01 | 0 | 0.05 | 最小 |
| Fragment_02 | 1 | 0.06 | |
| Fragment_03 | 2 | 0.07 | |
| Fragment_04 | 3 | 0.08 | |
| Fragment_05 | 4 | 0.09 | 最大 |

- **全体的に大きく** → `0.05` の部分を増やす（例: `0.01 * i + 0.1`）
- **均一サイズ** → `scale={0.1}` のように固定値に

### 5-3. アニメーションパラメータ

`useFrame` 内で制御:

| コード | 現在値 | 説明 | 調整 |
|---|---|---|---|
| `clock.elapsedTime * 0.8` | `0.8` | ふわふわの速さ | 大きい=速い |
| `i * 1.2` | `1.2` | 破片間の位相差 | 大きい=バラバラ感UP |
| `* 0.03` | `0.03` | 上下の振幅 | 大きい=大きく動く |
| `scroll * 1.5` | `1.5` | スクロールでの散らばり量 | 大きい=より広がる |
| `scroll * 0.5` | `0.5` | スクロールでの沈む量 | 大きい=より沈む |
| `0.03` | `0.03` | 自転の基本速度 | 大きい=速い |
| `scroll * 0.05` | `0.05` | スクロールでの自転加速 | 大きい=加速が強い |

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

3Dモデルのロード中にローディング画面を表示し、ロード完了後に「霧の中から出現」するオープニング演出。

### フェーズ管理

```tsx
const [phase, setPhase] = useState<'loading' | 'fog' | 'ready'>('loading');
```

| フェーズ | 表示状態 | 説明 |
|---|---|---|
| `loading` | ローディング画面 + 霧オーバーレイ | 3Dモデル読み込み中 |
| `fog` | 霧オーバーレイ（フェードアウト中） | ロード完了。霧が晴れていく |
| `ready` | 3Dシーンのみ | 全演出完了 |

### LoadingScreen コンポーネント

drei の `useProgress` フックで Canvas 内のアセット読み込み進捗を取得。Canvas の**外**でHTML描画する。

```tsx
const { progress, loaded, total } = useProgress();
```

| 要素 | z-index | 説明 |
|---|---|---|
| `.loadingOverlay` | `200` | 黒背景 + プログレスバー + シアンSVGアニメーション |
| `.fogOverlay` | `199` | 放射グラデーション霧（ローディング後にフェードアウト） |
| Canvas | `1` | 3Dシーン本体 |

### タイミング調整

```tsx
// ロード完了 → 500ms待機 → フェードアウト開始
const timer = setTimeout(() => {
  setFadeOut(true);
  // フェードアウト → 1500ms後にコールバック
  const removeTimer = setTimeout(onComplete, 1500);
}, 500);
```

| パラメータ | 現在値 | 説明 |
|---|---|---|
| ロード完了後の待機 | `500ms` | すぐにフェードしない余白 |
| ローディングフェードアウト | `1.5s` | CSS `transition: opacity 1.5s`（`.loadingOverlay`） |
| 霧が晴れるまでの待ち | `2000ms` | `setPhase('fog')` → `setPhase('ready')` の間隔 |
| 霧フェードアウト | `2s` | CSS `transition: opacity 2s`（`.fogOverlay`） |

- **ローディング画面を早く消したい** → `500ms` / `1500ms` を短く
- **霧が晴れる演出を長く** → `2000ms` / CSS `2s` を大きく
- **霧の色を変えたい** → `.fogOverlay` の `background` グラデーションを変更

### プログレスバー

```css
.loadingBar
  height 100%
  background #00e5ff
  transition width 0.3s ease
```

- **バーの色変更** → `background` を変更
- **バーの滑らかさ変更** → `transition` の duration を変更

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
| ライトが弱い | TIME_CONFIG の `intensity` / `dirIntensity` を上げる |
| directionalLight の方向 | `position` を調整して城に光が当たるようにする |

### 岩盤の位置がずれる

`<primitive object={nodes.Rock_Base} />` を使うこと。`<mesh geometry={...} material={...} />` だとGLBの元トランスフォームが失われる。

### 破片が見えない / 大きすぎる

`scale` の値を調整。現在は `0.01 * i + 0.05`（0.05〜0.09）。

### マウスパララックスが効かない

OrbitControls がカメラ位置を上書きしている可能性がある。`enableRotate={false}` にするとパララックスのみになる。

---

## コンポーネント構成

```
ThreeScene (export default)
├── Canvas
│   ├── SceneLighting        ← 時間変化ライティング + シアン脈動
│   │   ├── ambientLight     ← スクロールで色・強さ変化
│   │   ├── directionalLight ← スクロールで強さ変化
│   │   └── pointLight       ← スクロールで強さ変化 + sin脈動
│   ├── NightSky             ← 星空（スクロール40%以降で visible）
│   │   └── Stars
│   ├── MouseParallax        ← マウス追従カメラ
│   ├── Cloud × 2            ← 霧・モヤ演出
│   ├── ScrollSparkles       ← パーティクル（スクロール速度連動）
│   │   └── Sparkles
│   ├── Float                ← 全体の浮遊
│   │   └── Model            ← 城モデル + 破片アニメーション
│   │       ├── primitive (Rock_Base)
│   │       ├── primitive (Castle)
│   │       └── mesh × 5 (Rock_Fragment_01〜05) ← useFrameアニメーション
│   └── OrbitControls        ← ドラッグ操作
├── LoadingScreen            ← ローディング画面（Canvas外HTML）
└── fogOverlay               ← 霧オーバーレイ（CSSフェードアウト）
```

---

## 現在の実装値サマリー

```
カメラ:         position=[0, 0.5, 10]  fov=45
ズーム制限:      min=3  max=3（固定）
モデルオフセット:  [0, -1, 0]

--- ライティング（初期値 / スクロールで TIME_CONFIG に変化）---
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

--- 破片 ---
scale:    0.01*i + 0.05 (0.05〜0.09)
ふわふわ: speed=0.8  amplitude=0.03  phase=i*1.2
散らばり: scroll * 1.5
沈み:    scroll * 0.5
自転:    0.03 + scroll*0.05

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

--- ローディング ---
フェーズ: loading → fog → ready
ロード完了待機: 500ms → フェードアウト: 1.5s → 霧晴れ: 2s
z-index: loadingOverlay=200  fogOverlay=199  canvas=1

--- レンダラー ---
toneMapping: ACESFilmicToneMapping
outputColorSpace: SRGBColorSpace
```
