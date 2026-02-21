import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type IntensityRef = React.MutableRefObject<number>

interface CastleReactionsProps {
  activeCrystalId: string | null
  /** Ref to inner group for UI/UX 360° rotation */
  innerGroupRef: React.RefObject<THREE.Group | null>
}

// --- 1. Frontend: 窓がシアンに明滅 ---
function WindowShimmer({ intensity }: { intensity: IntensityRef }) {
  const lightsRef = useRef<THREE.PointLight[]>([])
  const baseDistance = 0.3

  // 城の窓位置に配置する複数のポイントライト
  const windowPositions = useMemo(() => [
    [0.15, 0.25, 0.35],
    [-0.15, 0.30, 0.30],
    [0.25, 0.15, -0.20],
    [-0.20, 0.20, -0.25],
    [0.05, 0.35, 0.15],
  ] as [number, number, number][], [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const fade = intensity.current
    if (fade < 0.01) {
      lightsRef.current.forEach(l => { if (l) l.intensity = 0 })
      return
    }
    lightsRef.current.forEach((light, i) => {
      if (!light) return
      // 各窓ごとに位相をずらした sin 波で明滅
      const flicker = Math.sin(t * 3.0 + i * 1.8) * 0.5 + 0.5
      light.intensity = flicker * 2.0 * fade
      // distance の脈動（intensity 連動 + sin 波）
      light.distance = baseDistance * fade + Math.sin(t + i) * 0.1
    })
  })

  return (
    <>
      {windowPositions.map((pos, i) => (
        <pointLight
          key={i}
          ref={(el) => { if (el) lightsRef.current[i] = el }}
          position={pos}
          color="#00e5ff"
          intensity={0}
          distance={0.3}
          decay={2}
        />
      ))}
    </>
  )
}

// --- 2. AI連携: 城上空にオーラ球 ---
function AuraSphere({ intensity }: { intensity: IntensityRef }) {
  const groupRef = useRef<THREE.Group>(null)
  const outerRef = useRef<THREE.Mesh>(null)
  const innerRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const fade = intensity.current

    // スケールイン/アウト（scale が opacity より先に到達）+ 呼吸スケール
    if (groupRef.current) {
      const scaleT = Math.min(fade * 1.5, 1.0)
      const breath = 1.0 + Math.sin(t * 1.5) * 0.1
      groupRef.current.scale.setScalar(scaleT * breath || 0.001)
    }

    if (outerRef.current) {
      const mat = outerRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = fade * (0.15 + Math.sin(t * 2) * 0.05)
      outerRef.current.scale.setScalar(1.0 + Math.sin(t * 1.5) * 0.1)
      outerRef.current.rotation.y = t * 0.3
    }
    if (innerRef.current) {
      const mat = innerRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = fade * (0.6 + Math.sin(t * 3) * 0.2)
      innerRef.current.scale.setScalar(0.5 + Math.sin(t * 2.5) * 0.05)
    }
  })

  return (
    <group ref={groupRef} position={[0, 0.8, 0]}>
      {/* 外殻 */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* コア */}
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// --- 3. WordPress: 回転するリング ---
function RotatingRings({ intensity }: { intensity: IntensityRef }) {
  const groupRef = useRef<THREE.Group>(null)
  const ring1Ref = useRef<THREE.Mesh>(null)
  const ring2Ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const fade = intensity.current

    // スケールイン/アウト（scale が opacity より先に到達）+ 呼吸スケール
    if (groupRef.current) {
      const scaleT = Math.min(fade * 1.5, 1.0)
      const breath = 1.0 + Math.sin(t * 1.5) * 0.1
      groupRef.current.scale.setScalar(scaleT * breath || 0.001)
    }

    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.8
      ring1Ref.current.rotation.x = Math.PI * 0.3
      const mat = ring1Ref.current.material as THREE.MeshBasicMaterial
      mat.opacity = fade * 0.5
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -t * 0.6
      ring2Ref.current.rotation.x = -Math.PI * 0.2
      const mat = ring2Ref.current.material as THREE.MeshBasicMaterial
      mat.opacity = fade * 0.4
    }
  })

  return (
    <group ref={groupRef} position={[0, 0.3, 0]}>
      <mesh ref={ring1Ref}>
        <torusGeometry args={[0.6, 0.015, 8, 48]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[0.5, 0.01, 8, 48]} />
        <meshBasicMaterial
          color="#67e8f9"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// --- 4. Database: 土台の回路脈動 + 上昇パーティクル ---
function CircuitPulse({ intensity }: { intensity: IntensityRef }) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Points>(null)
  const particleCount = 550

  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    const lifetimes = new Float32Array(particleCount)
    for (let i = 0; i < particleCount; i++) {
      resetParticle(positions, velocities, lifetimes, i)
    }
    return { positions, velocities, lifetimes }
  }, [])

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const fade = intensity.current

    // スケールイン/アウト（scale が opacity より先に到達）+ 呼吸スケール
    if (groupRef.current) {
      const scaleT = Math.min(fade * 1.5, 1.0)
      const breath = 1.0 + Math.sin(t * 1.5) * 0.1
      groupRef.current.scale.setScalar(scaleT * breath || 0.001)
    }

    const { positions, velocities, lifetimes } = particles

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      // 上昇（滝の逆）
      velocities[i3 + 1] += 0.3 * delta
      positions[i3] += velocities[i3] * delta * fade
      positions[i3 + 1] += velocities[i3 + 1] * delta * fade
      positions[i3 + 2] += velocities[i3 + 2] * delta * fade
      lifetimes[i] -= delta
      if (lifetimes[i] <= 0 || positions[i3 + 1] > 1.0) {
        resetParticle(positions, velocities, lifetimes, i)
      }
    }
    if (meshRef.current) {
      meshRef.current.geometry.attributes.position.needsUpdate = true
      const mat = meshRef.current.material as THREE.PointsMaterial
      mat.opacity = fade * 0.7
    }
  })

  return (
    <group ref={groupRef}>
    <points ref={meshRef} position={[0, -0.5, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={particles.positions}
          count={particleCount}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.006}
        color="#34d399"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
    </group>
  )
}

function resetParticle(
  positions: Float32Array,
  velocities: Float32Array,
  lifetimes: Float32Array,
  i: number
) {
  const i3 = i * 3
  // 土台の円周上にランダム配置
  const angle = Math.random() * Math.PI * 2
  const radius = 0.3 + Math.random() * 0.5
  positions[i3] = Math.cos(angle) * radius
  positions[i3 + 1] = 0
  positions[i3 + 2] = Math.sin(angle) * radius
  velocities[i3] = (Math.random() - 0.5) * 0.02
  velocities[i3 + 1] = 0.05 + Math.random() * 0.15
  velocities[i3 + 2] = (Math.random() - 0.5) * 0.02
  lifetimes[i] = 1.5 + Math.random() * 2.0
}

// --- 5. UI/UX: 城が360°回転（innerGroupRef を外部から制御） ---

// --- Main CastleReactions ---

const EFFECT_MAP: Record<string, string> = {
  'code-tablet': 'frontend',
  'ai-cube': 'ai',
  'gear-nature': 'wordpress',
  'database': 'database',
  'hologram-disc': 'uiux',
}

export function CastleReactions({ activeCrystalId, innerGroupRef }: CastleReactionsProps) {
  const activeEffect = activeCrystalId ? EFFECT_MAP[activeCrystalId] ?? null : null

  // 各エフェクトの intensity を ref で管理（useFrame で lerp）
  const frontendIntensity = useRef(0)
  const aiIntensity = useRef(0)
  const wpIntensity = useRef(0)
  const dbIntensity = useRef(0)
  const uiuxIntensity = useRef(0)
  const uiuxRotation = useRef(0)
  const castleScaleRef = useRef(1.0)

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const speed = 2.0 * delta // ~0.5秒で 0→1

    frontendIntensity.current += ((activeEffect === 'frontend' ? 1 : 0) - frontendIntensity.current) * speed
    aiIntensity.current += ((activeEffect === 'ai' ? 1 : 0) - aiIntensity.current) * speed
    wpIntensity.current += ((activeEffect === 'wordpress' ? 1 : 0) - wpIntensity.current) * speed
    dbIntensity.current += ((activeEffect === 'database' ? 1 : 0) - dbIntensity.current) * speed
    uiuxIntensity.current += ((activeEffect === 'uiux' ? 1 : 0) - uiuxIntensity.current) * speed

    if (innerGroupRef.current) {
      // UI/UX: 360° smooth 回転
      if (uiuxIntensity.current > 0.01) {
        uiuxRotation.current += delta * 0.8 * uiuxIntensity.current
        innerGroupRef.current.rotation.y = uiuxRotation.current
      } else {
        // フェードアウト後、回転を 0 に戻す
        uiuxRotation.current *= 0.95
        innerGroupRef.current.rotation.y = uiuxRotation.current
      }

      // 城のスケールアニメーション: クリスタル active → 拡大 + 呼吸
      const targetScale = activeEffect ? 1.2 : 1.0
      castleScaleRef.current += (targetScale - castleScaleRef.current) * speed
      const breath = activeEffect ? Math.sin(t * 1.5) * 0.03 : 0
      innerGroupRef.current.scale.setScalar(castleScaleRef.current + breath)
    }
  })

  return (
    <>
      <WindowShimmer intensity={frontendIntensity} />
      <AuraSphere intensity={aiIntensity} />
      <RotatingRings intensity={wpIntensity} />
      <CircuitPulse intensity={dbIntensity} />
    </>
  )
}
