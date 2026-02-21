# SP WEB CREAT. ポートフォリオ — R3F実装ナレッジ

> このドキュメントは Claude Code エージェント向けの実装指示書です。
> Blenderで最適化済みの3Dアセットを React Three Fiber（R3F）で
> ポートフォリオサイトに組み込む作業をまとめています。

---

## プロジェクト概要

### サイト情報
- **URL**: https://sp-webcreat.pro/
- **フレームワーク**: Astro.js
- **3Dライブラリ**: React Three Fiber + drei
- **スタイル**: TailwindCSS
- **言語**: TypeScript

### アクセントカラー
- **シアン: #00e5ff** — 全アセット共通のキーカラー

### 既存3Dシーン → 新3Dシーンへの移行
- **旧GLB**: `floating-castle.glb`（9.88MB / 229,530ポリゴン）
  - オブジェクト: `Rock_Base`, `Castle`, `Rock_Fragment_01〜05`
  - マテリアル: `Mat_Rock`, `Mat_Castle`
- **新GLB（差替え）**: `floating-castle.glb`（Meshy再生成 / 約200,000〜250,000ポリゴン）
  - オブジェクト: `Castle_Island`（城＋岩盤の一体構造）
  - Rock_Fragment は含まれない（スキルの結晶で代替）
  - シアン回路パターン・ダークゴシック石材・シアン窓光
- Draco圧縮: レベル6
- Dracoデコーダー: `https://www.gstatic.com/draco/versioned/decoders/1.5.6/`
- 座標系: Y-up

---

## 配置済みGLBファイル一覧

```
public/models/
  ├── floating-castle.glb          ← 城＋岩盤（新モデルで差替え予定）
  ├── crystal-code-tablet.glb      ← 結晶① コードの石碑（配置済み）
  ├── crystal-ai-cube.glb          ← 結晶② AIコアキューブ（配置済み）
  ├── crystal-gear-nature.glb      ← 結晶③ 歯車×自然（配置済み）
  ├── crystal-database.glb         ← 結晶④ データベース結晶（配置済み）
  └── crystal-hologram-disc.glb    ← 結晶⑤ ホログラムディスク（配置済み）
```

> **注意**: floating-castle.glb は Blenderでの最適化作業後に差し替えられる。
> 差替え後、モデル内のオブジェクト名が変わるため、
> 読み込みコードの更新が必要（後述の Task 0 参照）。

---

## 実装タスク一覧

### Task 0: 城＆岩盤モデルの差し替え（最優先）

新しい floating-castle.glb（城＋岩盤の一体モデル）に対応するよう、
既存の FloatingCastle コンポーネントを更新する。

#### 変更の要点

旧モデルは `Rock_Base`, `Castle`, `Rock_Fragment_01〜05` の複数オブジェクトだったが、
新モデルは **`Castle_Island` という1つのオブジェクト**（または `Castle` と `Rock_Base` の2つ）になる。
`Rock_Fragment_01〜05` は新モデルに含まれない（Task 1 のスキルの結晶で代替）。

#### 新しいGLB読み込みコード

```tsx
import { useGLTF } from '@react-three/drei'

useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')

export function FloatingCastle() {
  const { nodes, materials } = useGLTF('/models/floating-castle.glb')

  // 新モデルのオブジェクト構造を確認して適宜修正
  // パターンA: 一体オブジェクト（Castle_Island）の場合
  return (
    <group>
      <primitive object={nodes.Castle_Island || nodes.Scene} />
    </group>
  )

  // パターンB: 城と岩盤が分離されている場合
  // return (
  //   <group>
  //     <mesh geometry={nodes.Castle.geometry} material={materials.Mat_Castle} />
  //     <mesh geometry={nodes.Rock_Base.geometry} material={materials.Mat_Rock} />
  //   </group>
  // )
}
```

#### 重要: オブジェクト名の確認手順

新しいGLBのオブジェクト名は Blenderでの処理結果次第で変わる可能性がある。
実装時に以下のコードで実際のオブジェクト名を確認すること:

```tsx
const gltf = useGLTF('/models/floating-castle.glb')
console.log('nodes:', Object.keys(gltf.nodes))
console.log('materials:', Object.keys(gltf.materials))
```

#### 旧コードで削除すべき箇所

```tsx
// 【削除】旧・浮遊破片のレンダリング
// Rock_Fragment_01〜05 に関するコードを全て削除
// → 浮遊アニメーション用の basePositions も不要に
// → fragmentRefs も不要に
```

#### 旧コードで残すもの

```tsx
// 【残す】城本体の浮遊アニメーション（ゆっくり上下する演出がある場合）
// 【残す】ライティング設定（ただし新モデルの雰囲気に合わせて微調整の可能性あり）
// 【残す】スクロール連動の時間変化
```

---

### Task 1: スキルの結晶コンポーネント

旧・浮遊破片（Rock_Fragment_01〜05）を、スキルの結晶に差し替える。

#### 結晶データ定義

```tsx
const SKILL_CRYSTALS = [
  {
    id: 'code-tablet',
    model: '/models/crystal-code-tablet.glb',
    position: [1.00, 0.10, 0.57] as const,
    title: 'Frontend',
    description: 'HTML/CSS/JS/TSによるモダンフロントエンド開発',
    tags: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'Three.js', 'TailwindCSS'],
    emissiveIntensity: 0.8,
  },
  {
    id: 'ai-cube',
    model: '/models/crystal-ai-cube.glb',
    position: [-1.00, 0.30, 0.84] as const,
    title: 'AI連携',
    description: 'Claude API / Gemini APIを活用したAI機能開発',
    tags: ['Claude API', 'Gemini API'],
    emissiveIntensity: 1.0,
  },
  {
    id: 'gear-nature',
    model: '/models/crystal-gear-nature.glb',
    position: [-0.92, -0.10, -0.77] as const,
    title: 'WordPress / CMS',
    description: 'WordPress構築・プラグイン開発・CMS自動化',
    tags: ['WordPress', 'PHP', 'REST API', 'カスタムテーマ'],
    emissiveIntensity: 0.6,
  },
  {
    id: 'database',
    model: '/models/crystal-database.glb',
    position: [0.93, 0.50, -1.11] as const,
    title: 'Database / Infra',
    description: 'データベース設計からインフラ構築まで',
    tags: ['MySQL', 'PostgreSQL', 'Supabase', 'Firebase', 'Docker', 'Vercel'],
    emissiveIntensity: 0.8,
  },
  {
    id: 'hologram-disc',
    model: '/models/crystal-hologram-disc.glb',
    position: [0.00, -0.25, 1.60] as const,
    title: 'UI/UX Design',
    description: 'ユーザー体験を重視したUI/UXデザイン',
    tags: ['Figma', 'レスポンシブ', 'アクセシビリティ'],
    emissiveIntensity: 0.8,
  },
] as const
```

#### 個別結晶コンポーネント

```tsx
import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'

interface SkillCrystalProps {
  model: string
  position: readonly [number, number, number]
  title: string
  description: string
  tags: readonly string[]
  emissiveIntensity: number
  index: number
}

function SkillCrystal({
  model, position, title, description, tags,
  emissiveIntensity, index
}: SkillCrystalProps) {
  const { scene } = useGLTF(model)
  const meshRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.elapsedTime

    // 浮遊アニメーション
    meshRef.current.position.y =
      position[1] + Math.sin(t * 0.8 + index * 1.2) * 0.03

    // ゆっくり自転
    meshRef.current.rotation.y += 0.002 * (index % 2 === 0 ? 1 : -1)

    // 脈動する発光（マテリアルのemissiveIntensityを動的に変更）
    meshRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial
        if (mat.emissive) {
          mat.emissiveIntensity =
            emissiveIntensity + Math.sin(t * 1.5 + index * 0.8) * 0.3
          // ホバー時は発光を強化
          if (hovered) {
            mat.emissiveIntensity *= 1.5
          }
        }
      }
    })
  })

  return (
    <group
      ref={meshRef}
      position={[position[0], position[1], position[2]]}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'default'
      }}
      scale={hovered ? 1.15 : 1.0}
    >
      <primitive object={scene.clone()} />

      {/* ホバー時のツールチップ */}
      {hovered && (
        <Html center position={[0, 0.3, 0]} distanceFactor={3}>
          <div className="skill-tooltip">
            <h3>{title}</h3>
            <p>{description}</p>
            <div className="skill-tags">
              {tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}
```

#### ツールチップCSS

```css
.skill-tooltip {
  background: rgba(0, 10, 20, 0.9);
  border: 1px solid rgba(0, 229, 255, 0.4);
  border-radius: 8px;
  padding: 16px 20px;
  color: #e0f7ff;
  backdrop-filter: blur(8px);
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.15);
  min-width: 200px;
  max-width: 280px;
  pointer-events: none;
  white-space: nowrap;
}
.skill-tooltip h3 {
  color: #00e5ff;
  font-size: 14px;
  font-weight: bold;
  margin: 0 0 6px 0;
}
.skill-tooltip p {
  font-size: 12px;
  margin: 0 0 8px 0;
  opacity: 0.85;
  white-space: normal;
}
.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.skill-tags span {
  display: inline-block;
  background: rgba(0, 229, 255, 0.1);
  border: 1px solid rgba(0, 229, 255, 0.3);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  color: #b0e8ff;
}
```

#### 既存のRock_Fragment描画を結晶に差し替え

既存コードで Rock_Fragment_01〜05 をレンダリングしている箇所を探し、
SKILL_CRYSTALS に基づく SkillCrystal コンポーネントに置き換える。

```tsx
// 【削除】旧・浮遊破片のレンダリング
// {[1, 2, 3, 4, 5].map((i) => (
//   <mesh key={i}
//     geometry={nodes[`Rock_Fragment_0${i}`].geometry}
//     material={materials.Mat_Rock}
//   />
// ))}

// 【追加】スキルの結晶
import { Suspense } from 'react'

<Suspense fallback={null}>
  {SKILL_CRYSTALS.map((crystal, i) => (
    <SkillCrystal key={crystal.id} index={i} {...crystal} />
  ))}
</Suspense>
```

#### GLBプリロード

```tsx
// 全結晶を事前ロード
SKILL_CRYSTALS.forEach((c) => useGLTF.preload(c.model))
```

---

### Task 2: 水の演出（堀＋小川＋滝＋滝壺霧）

水はR3Fのシェーダー＆パーティクルで実装。3Dモデルは不要（一部Blenderでジオメトリ作成の可能性あり）。

#### 2-1. 堀の水面（カスタムシェーダー）

城の周囲を囲む環状の水面。平面メッシュ＋シェーダーで波紋を表現。

```tsx
import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

const MoatWaterMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#00e5ff'),
    uOpacity: 0.6,
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUv;

    float wave(vec2 p, float t) {
      return sin(p.x * 8.0 + t) * 0.5
           + sin(p.y * 6.0 - t * 0.7) * 0.3
           + sin((p.x + p.y) * 12.0 + t * 1.3) * 0.2;
    }

    void main() {
      float w = wave(vUv, uTime) * 0.5 + 0.5;
      vec3 color = uColor * (0.6 + w * 0.4);
      float edgeGlow = smoothstep(0.0, 0.15, vUv.x)
                     * smoothstep(0.0, 0.15, 1.0 - vUv.x);
      color += uColor * (1.0 - edgeGlow) * 0.3;
      gl_FragColor = vec4(color, uOpacity * (0.5 + w * 0.3));
    }
  `
)

extend({ MoatWaterMaterial })
```

> **注意**: 堀と小川のジオメトリは、メインの floating-castle.glb に
> Moat_Water / Stream_01 / Stream_02 が含まれているか確認すること。
> 含まれていない場合は、R3Fで RingGeometry 等で代用するか、
> Blender側で追加作成を依頼する。

#### 2-2. 滝（パーティクルシステム）

岩盤の縁から落ちるシアン発光の水。

```tsx
function Waterfall({ position, width = 0.15 }: {
  position: [number, number, number]
  width?: number
}) {
  const particleCount = 200
  const meshRef = useRef<THREE.Points>(null)

  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    const lifetimes = new Float32Array(particleCount)
    for (let i = 0; i < particleCount; i++) {
      resetParticle(positions, velocities, lifetimes, i, width)
    }
    return { positions, velocities, lifetimes }
  }, [])

  useFrame((_, delta) => {
    const { positions, velocities, lifetimes } = particles
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      velocities[i3 + 1] -= 0.8 * delta
      positions[i3]     += velocities[i3] * delta
      positions[i3 + 1] += velocities[i3 + 1] * delta
      positions[i3 + 2] += velocities[i3 + 2] * delta
      lifetimes[i] -= delta
      if (lifetimes[i] <= 0 || positions[i3 + 1] < -1.5) {
        resetParticle(positions, velocities, lifetimes, i, width)
      }
    }
    if (meshRef.current) {
      meshRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={meshRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={particles.positions}
          count={particleCount}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.008} color="#00e5ff"
        transparent opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false} sizeAttenuation
      />
    </points>
  )
}

function resetParticle(
  positions: Float32Array,
  velocities: Float32Array,
  lifetimes: Float32Array,
  i: number,
  width: number
) {
  const i3 = i * 3
  positions[i3]     = (Math.random() - 0.5) * width
  positions[i3 + 1] = Math.random() * 0.05
  positions[i3 + 2] = (Math.random() - 0.5) * 0.02
  velocities[i3]     = (Math.random() - 0.5) * 0.02
  velocities[i3 + 1] = -0.1 - Math.random() * 0.2
  velocities[i3 + 2] = (Math.random() - 0.5) * 0.05
  lifetimes[i] = 1.5 + Math.random() * 1.0
}
```

配置例:
```tsx
<Waterfall position={[0.5, -0.1, 0.8]} width={0.12} />
<Waterfall position={[-0.6, -0.1, -0.5]} width={0.08} />
```

#### 2-3. 滝壺の霧

```tsx
import { Cloud } from '@react-three/drei'

<Cloud position={[0.5, -0.5, 0.8]}
  opacity={0.15} speed={0.2} width={0.5} depth={0.3}
  segments={4} color="#80e5ff" />
<Cloud position={[-0.6, -0.5, -0.5]}
  opacity={0.12} speed={0.15} width={0.4} depth={0.25}
  segments={4} color="#80e5ff" />
```

---

### Task 3: リアルタイム連動

段階的に3レイヤーを重ねる設計。まずレイヤー1から実装。

#### レイヤー1: 時間帯連動（外部API不要）

```tsx
interface TimeState {
  period: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night'
  ambient: string
  ambientIntensity: number
  sunColor: string
  sunIntensity: number
  cyanBoost: number
  fogDensity: number
}

function getTimeState(): TimeState {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 8) return {
    period: 'dawn', ambient: '#fff5e0', ambientIntensity: 0.6,
    sunColor: '#ffcc80', sunIntensity: 0.8, cyanBoost: 0.3, fogDensity: 0.4,
  }
  if (hour >= 8 && hour < 12) return {
    period: 'morning', ambient: '#ffffff', ambientIntensity: 1.0,
    sunColor: '#ffffff', sunIntensity: 1.2, cyanBoost: 0.2, fogDensity: 0.15,
  }
  if (hour >= 12 && hour < 17) return {
    period: 'afternoon', ambient: '#fff8f0', ambientIntensity: 0.9,
    sunColor: '#ffe0b2', sunIntensity: 1.0, cyanBoost: 0.3, fogDensity: 0.2,
  }
  if (hour >= 17 && hour < 20) return {
    period: 'evening', ambient: '#ff8c42', ambientIntensity: 0.5,
    sunColor: '#ff6b35', sunIntensity: 0.6, cyanBoost: 0.7, fogDensity: 0.25,
  }
  return {
    period: 'night', ambient: '#0a0a2e', ambientIntensity: 0.15,
    sunColor: '#4a4a8a', sunIntensity: 0.1, cyanBoost: 1.0, fogDensity: 0.1,
  }
}

function useTimeOfDay() {
  const [state, setState] = useState(() => getTimeState())
  useEffect(() => {
    const interval = setInterval(() => setState(getTimeState()), 1800000)
    return () => clearInterval(interval)
  }, [])
  return state
}
```

#### レイヤー2: 天気API連動（後日追加）

Astro.jsのAPIルート:
```tsx
// src/pages/api/weather.ts
export async function GET() {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=34.6937&lon=135.5023&appid=${import.meta.env.WEATHER_API_KEY}`
  )
  const data = await res.json()
  return new Response(JSON.stringify({
    condition: data.weather[0].main,
    temp: data.main.temp - 273.15,
    windSpeed: data.wind.speed,
  }))
}
```

天気に応じたエフェクト:
| 天気 | 演出 |
|------|------|
| Clear | 雲少なめ、光クリア |
| Clouds | 雲量UP、トーンダウン |
| Rain | 雨粒パーティクル＋雲暗め |
| Thunderstorm | 白フラッシュ＋PointLightフリッカー |
| Snow | 白パーティクルがゆっくり降る |

#### レイヤー3: アクティビティ連動（後日追加）

候補（実装が簡単な順）:
1. ブログ投稿頻度（Astro Content Collectionsから算出・API不要）
2. サイトアクセス数（Vercel Analytics API）
3. GitHubコントリビューション（GitHub GraphQL API）

#### レイヤーの合成

```tsx
function useSceneParameters() {
  const time = useTimeOfDay()
  const weather = useWeather()       // レイヤー2追加時
  const activity = useActivity()     // レイヤー3追加時

  return useMemo(() => ({
    ambientColor: time.ambient,
    ambientIntensity: time.ambientIntensity,
    cloudOpacity: time.fogDensity + (weather?.cloudBoost || 0),
    rainParticles: weather?.rainParticles || 0,
    cyanIntensity: 80 * time.cyanBoost + (activity?.score || 0) * 40,
    cyanPulseSpeed: 0.5 + (activity?.score || 0) * 1.5,
  }), [time, weather, activity])
}
```

---

### Task 4: スケール感演出のアセット（Blender処理完了後に実施）

城のシーンに「生きている世界」の演出を追加する4つのアセット。

#### GLBファイル

```
public/models/
  ├── drone-scout.glb       ← 偵察ドローン（城の周囲を周回）
  ├── orbital-ring.glb      ← 巨大リング（遠景のシルエット）
  ├── tiny-wanderer.glb     ← ローブの旅人（城の上を歩く）
  └── mechanical-bird.glb   ← 機械の鳥（空を飛ぶ群れ）
```

#### 4-1. 偵察ドローン（DroneScout）

城の周囲を周回飛行する小さなメカ。

```tsx
function DroneScout() {
  const { scene } = useGLTF('/models/drone-scout.glb')
  const ref = useRef<THREE.Group>(null)

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial
        mat.emissive = new THREE.Color('#00e5ff')
        mat.emissiveIntensity = 0.8
        mat.needsUpdate = true
      }
    })
  }, [scene])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime * 0.3 // ゆっくり周回
    const radius = 2.5 // 城からの距離
    ref.current.position.x = Math.cos(t) * radius
    ref.current.position.z = Math.sin(t) * radius
    ref.current.position.y = 0.8 + Math.sin(t * 2) * 0.1 // 上下に揺れる
    // 進行方向を向く
    ref.current.rotation.y = -t + Math.PI / 2
  })

  return (
    <group ref={ref} scale={0.08}>
      <primitive object={scene.clone()} />
      <pointLight color="#00e5ff" intensity={2.0} distance={0.5} decay={2} />
    </group>
  )
}
```

#### 4-2. 巨大リング（OrbitalRing）

遠景に浮かぶ巨大な古代リング。半透明でゆっくり回転。

```tsx
function OrbitalRing() {
  const { scene } = useGLTF('/models/orbital-ring.glb')
  const ref = useRef<THREE.Group>(null)

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial
        mat.emissive = new THREE.Color('#00e5ff')
        mat.emissiveIntensity = 0.5
        mat.transparent = true
        mat.opacity = 0.15
        mat.needsUpdate = true
      }
    })
  }, [scene])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.02
    ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.01) * 0.05
  })

  return (
    <group ref={ref}
      position={[15, 8, -30]}
      scale={8}
      rotation={[0.3, 0, 0.1]}
    >
      <primitive object={scene.clone()} />
    </group>
  )
}
```

#### 4-3. ローブの旅人（TinyWanderer）

城の上を歩く極小の巡礼者。杖の光だけが見える。

```tsx
function TinyWanderer() {
  const { scene } = useGLTF('/models/tiny-wanderer.glb')
  const ref = useRef<THREE.Group>(null)

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial
        mat.emissive = new THREE.Color('#00e5ff')
        mat.emissiveIntensity = 0.6
        mat.needsUpdate = true
      }
    })
  }, [scene])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime * 0.05 // 非常にゆっくり移動
    // 城の上面を直線的に歩く
    ref.current.position.x = Math.sin(t) * 0.3
    ref.current.position.z = Math.cos(t) * 0.3
  })

  return (
    <group ref={ref}
      position={[0.1, 0.65, 0.2]}
      scale={0.015}
    >
      <primitive object={scene.clone()} />
      <pointLight color="#00e5ff" intensity={1.5} distance={0.3} decay={2}
        position={[0, 2, 0]} /> {/* 杖の先端あたり */}
    </group>
  )
}
```

#### 4-4. 機械の鳥の群れ（MechanicalBirds）

InstancedMeshで1つのモデルから複数羽を生成。

```tsx
function MechanicalBirds({ count = 7 }: { count?: number }) {
  const { scene } = useGLTF('/models/mechanical-bird.glb')
  const birdsRef = useRef<THREE.Group[]>([])

  // 各鳥のパラメータを事前計算
  const birdParams = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      radius: 1.5 + Math.random() * 2.0,
      height: 0.5 + Math.random() * 1.5,
      speed: 0.2 + Math.random() * 0.3,
      phase: (Math.PI * 2 * i) / count,
      wobble: 0.05 + Math.random() * 0.1,
    }))
  , [count])

  useFrame(({ clock }) => {
    birdsRef.current.forEach((ref, i) => {
      if (!ref) return
      const p = birdParams[i]
      const t = clock.elapsedTime * p.speed + p.phase
      ref.position.x = Math.cos(t) * p.radius
      ref.position.z = Math.sin(t) * p.radius
      ref.position.y = p.height + Math.sin(t * 3) * p.wobble
      ref.rotation.y = -t + Math.PI / 2
    })
  })

  return (
    <group>
      {birdParams.map((_, i) => (
        <group key={i} ref={(el) => { if (el) birdsRef.current[i] = el }}
          scale={0.02}
        >
          <primitive object={scene.clone()} />
        </group>
      ))}
    </group>
  )
}
```

#### シーンへの配置

```tsx
<Suspense fallback={null}>
  {/* 結晶 */}
  {SKILL_CRYSTALS.map((crystal, i) => (
    <SkillCrystal key={crystal.id} index={i} {...crystal} />
  ))}

  {/* スケール感演出 */}
  <DroneScout />
  <OrbitalRing />
  <TinyWanderer />
  <MechanicalBirds count={7} />
</Suspense>
```

#### GLBプリロード

```tsx
useGLTF.preload('/models/drone-scout.glb')
useGLTF.preload('/models/orbital-ring.glb')
useGLTF.preload('/models/tiny-wanderer.glb')
useGLTF.preload('/models/mechanical-bird.glb')
```

---

## 既存コードの参考情報

### 現在のGLB読み込み（旧・差し替え対象）

```tsx
import { useGLTF } from '@react-three/drei'

useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')

export function FloatingCastle() {
  const { nodes, materials } = useGLTF('/floating-castle.glb')

  return (
    <group>
      <mesh geometry={nodes.Rock_Base.geometry} material={materials.Mat_Rock} />
      <mesh geometry={nodes.Castle.geometry} material={materials.Mat_Castle} />
      {/* ↓ この部分を削除してスキルの結晶に差し替え */}
      {[1, 2, 3, 4, 5].map((i) => (
        <mesh key={i}
          geometry={nodes[`Rock_Fragment_0${i}`].geometry}
          material={materials.Mat_Rock}
        />
      ))}
    </group>
  )
}
```

> **Task 0 で上記を新モデル対応に書き換え、
> Task 1 で Rock_Fragment 部分をスキルの結晶コンポーネントに置換する。**

### 現在のライティング

```tsx
<ambientLight intensity={0.6} color="#e8f4ff" />
<directionalLight position={[5, 8, 3]} intensity={1.2} color="#ffffff" castShadow />
<pointLight position={[0, -0.55, 0]} color="#00e5ff" intensity={80} castShadow={false} />
```

### 現在の浮遊アニメーション（旧・Rock_Fragment用 → 削除対象）

```tsx
// ↓ 以下は旧コード。Rock_Fragment は新モデルに含まれないため、
//   このアニメーション処理は削除し、
//   代わりにスキルの結晶用の浮遊アニメーション（Task 1）を使う。

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
// ↑ 上記を削除し、SkillCrystal コンポーネント内の
//   useFrame で同様の浮遊アニメーションを実装する
```

### スクロール連動の時間変化

```tsx
const timeConfig = [
  { at: 0.00, ambient: '#fff5e0', intensity: 0.8, label: '朝' },
  { at: 0.25, ambient: '#ffffff', intensity: 1.0, label: '昼' },
  { at: 0.50, ambient: '#ff8c42', intensity: 0.7, label: '夕方' },
  { at: 0.75, ambient: '#1a1a3e', intensity: 0.3, label: '夜' },
  { at: 1.00, ambient: '#0a0a1a', intensity: 0.15, label: '深夜' },
]
```

---

## パフォーマンス注意点

| 項目 | 対策 |
|------|------|
| GLBロード | `useGLTF.preload()` で事前ロード。結晶は `<Suspense>` でラップ |
| ポリゴン総数 | 城20〜25万 + 結晶5つ（各4,000〜5,000）= 約22〜27万。余裕あり |
| 城モデル差替え | 新GLBのオブジェクト名を `console.log` で確認してからコードに反映 |
| Emissive脈動 | `useFrame` 内で `traverse` は毎フレーム走るので、重いなら初回のみmaterial参照をキャッシュ |
| ホバーのraycast | 結晶5つのみ対象。`meshBounds` で簡易バウンディングボックス判定も検討 |
| 滝パーティクル | 各200個 × 2〜3本 = 最大600個。AdditiveBlendingなのでdepthWrite=false必須 |
| Cloud（霧） | segments を4〜8に抑える |
| テクスチャ | 結晶は512×512。城は1024×1024 |

---

## 実装の優先順位

```
[Step 1] Task 0 — 城＆岩盤モデルの差し替え
  新GLBに合わせてFloatingCastleコンポーネントを更新
  ※ Blenderでの最適化完了後に実施

[Step 2] Task 1 — スキルの結晶の読み込み＆表示
  Rock_Fragment を削除し、結晶コンポーネントに差し替え
  浮遊アニメーション適用

[Step 3] Task 1 — 結晶の視認性＆発光修正
  各結晶にシアンPointLight追加 + Emissive強制設定
  ホログラムディスクの白い面の色味補正
  ※ 詳細は crystal-fix-instructions.md を参照

[Step 4] Task 1 — ホバーインタラクション＆ツールチップ
  マウスホバーで結晶が光り、スキル情報がポップアップ

[Step 5] Task 4 — スケール感演出アセットの実装
  ドローン（周回）、巨大リング（遠景）、旅人（城上）、鳥（群れ飛行）
  ※ Blenderでのマテリアル調整＆エクスポート完了後に実施

[Step 6] Task 3 — リアルタイム連動（レイヤー1: 時間帯）
  訪問者のローカル時間でシーンの雰囲気を変更

[Step 7] Task 3 — リアルタイム連動（レイヤー2: 天気）
  OpenWeatherMap API連携

[後回し] Task 2 — 水の演出（堀＋小川＋滝＋滝壺霧）
  城モデルの最終形状が確定し、Blenderで水面ジオメトリを作成してから実装。
```

> **Step 1 は Blender作業（城の最適化）が完了するまで着手不可。**
> Step 5 は Blender作業（Phase 3アセットのマテリアル調整）完了後に実施。
> Blender待ちの間に Step 2〜4 のスキルの結晶を先行実装してもOK。

---

*このドキュメントは claude.ai のプランニングチャットで策定された
全体計画に基づいています。
作業中に判断に迷った場合は、プランニングチャット側で相談してください。*