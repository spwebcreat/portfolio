# R3F実装ナレッジ

## 技術スタック
- Astro.js + React + TypeScript
- React Three Fiber + drei
- TailwindCSS

## 3Dシーン構成

### コンポーネント構成（現在）
```
ThreeScene
├── Canvas
│   ├── SceneLighting（時間変化ライティング + シアン脈動）
│   ├── NightSky（星空 / スクロール40%以降で表示）
│   ├── MouseParallax（マウス追従カメラ）
│   ├── Cloud × 2（霧・モヤ演出）
│   ├── ScrollSparkles（パーティクル / スクロール速度連動）
│   ├── Float → Model（城 + 結晶 + スケール演出アセット）
│   └── OrbitControls
├── LoadingScreen（Canvas外HTML）
└── fogOverlay（CSSフェードアウト）
```

### 実装済みアセット
- 城＆岩盤（floating-castle.glb）
- スキルの結晶 × 5（ホバーインタラクション + ツールチップ付き）
- 偵察ドローン（周回飛行）
- 巨大リング（遠景・半透明）
- ローブの旅人（歩行アニメーション）
- 機械の鳥（7羽群れ飛行）

### 共通仕様
- Dracoデコーダー: https://www.gstatic.com/draco/versioned/decoders/1.5.6/
- アクセントカラー: #00e5ff
- GLBプリロード: useGLTF.preload() で全モデル事前ロード

## 未着手タスク（ロードマップ）

### 優先度: 高
1. **リアルタイム連動 レイヤー1: 時間帯** — 訪問者のローカル時間でシーン雰囲気を変更
2. **リアルタイム連動 レイヤー2: 天気API** — OpenWeatherMap連携

### 優先度: 中
3. **水の演出** — 堀（カスタムシェーダー）+ 滝（パーティクル）+ 滝壺の霧
   - 城の最終形状確定後に着手
   - Blenderで堀・水路ジオメトリ作成が必要な可能性あり

### 優先度: 低
4. **リアルタイム連動 レイヤー3: アクティビティ** — ブログ投稿頻度、GitHub貢献等
5. **遠景浮遊岩群** — 城の岩盤を縮小コピーして配置（distant-rocks.glb）
6. **3Dビューワーサンプルページ** — クライアント向けデモ

## 水の演出 参考実装

### 堀の水面（カスタムシェーダー）

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

> **注意**: 堀のジオメトリは floating-castle.glb に含まれていない場合、
> R3Fで RingGeometry 等で代用するか、Blender側で追加作成が必要。

### 滝（パーティクルシステム）

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
  positions: Float32Array, velocities: Float32Array,
  lifetimes: Float32Array, i: number, width: number
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

### 滝壺の霧

```tsx
import { Cloud } from '@react-three/drei'

<Cloud position={[0.5, -0.5, 0.8]}
  opacity={0.15} speed={0.2} width={0.5} depth={0.3}
  segments={4} color="#80e5ff" />
<Cloud position={[-0.6, -0.5, -0.5]}
  opacity={0.12} speed={0.15} width={0.4} depth={0.25}
  segments={4} color="#80e5ff" />
```

## リアルタイム連動 参考実装

### レイヤー1: 時間帯連動（外部API不要）

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

### レイヤー2: 天気API連動

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

### レイヤーの合成

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
