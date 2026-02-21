import { useRef, useMemo, useState, useEffect, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three'

// --- Utilities ---

const CYAN_BOOST_CONFIG = [
  { at: 0.00, boost: 0.2 },
  { at: 0.25, boost: 0.2 },
  { at: 0.50, boost: 0.4 },
  { at: 0.75, boost: 0.8 },
  { at: 1.00, boost: 1.0 },
]

/** Scroll progress (0-1) to cyan emissive boost (0.2-1.0) */
export function getScrollCyanBoost(scroll: number): number {
  let lower = CYAN_BOOST_CONFIG[0]
  let upper = CYAN_BOOST_CONFIG[CYAN_BOOST_CONFIG.length - 1]
  for (let i = 0; i < CYAN_BOOST_CONFIG.length - 1; i++) {
    if (scroll >= CYAN_BOOST_CONFIG[i].at && scroll <= CYAN_BOOST_CONFIG[i + 1].at) {
      lower = CYAN_BOOST_CONFIG[i]
      upper = CYAN_BOOST_CONFIG[i + 1]
      break
    }
  }
  const range = upper.at - lower.at || 1
  const t = (scroll - lower.at) / range
  return THREE.MathUtils.lerp(lower.boost, upper.boost, t)
}

/** Mobile detection hook */
export function useMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])

  return isMobile
}

// --- Shared types ---

interface AssetProps {
  cyanBoostRef: MutableRefObject<number>
}

// --- 1. DroneScout: orbits castle at radius 2.5 ---

const DRONE_URL = '/models/drone-scout.glb'

export function DroneScout({ cyanBoostRef }: AssetProps) {
  const { scene } = useGLTF(DRONE_URL)
  const groupRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const clonedScene = useMemo(() => scene.clone(), [scene])

  const emissiveMats = useMemo(() => {
    const mats: THREE.MeshStandardMaterial[] = []
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial
        if (mat.emissive && mat.emissive.getHex() !== 0x000000) {
          mats.push(mat)
        }
      }
    })
    return mats
  }, [clonedScene])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.elapsedTime
    const boost = cyanBoostRef.current

    // Orbit around castle
    const angle = t * 0.3
    const radius = 2.5
    groupRef.current.position.set(
      Math.cos(angle) * radius,
      0.8 + Math.sin(t * 0.5) * 0.2,
      Math.sin(angle) * radius,
    )
    // Face forward along orbit
    groupRef.current.rotation.y = -angle + Math.PI * 0.5

    // Emissive
    emissiveMats.forEach((mat) => {
      mat.emissiveIntensity = 2.0 * boost
    })

    if (lightRef.current) {
      lightRef.current.intensity = 1.5 * boost
    }
  })

  return (
    <group ref={groupRef} scale={0.08}>
      <primitive object={clonedScene} />
      <pointLight
        ref={lightRef}
        color="#00e5ff"
        intensity={1.5}
        distance={3}
        decay={2}
        position={[0, 0, 0]}
      />
    </group>
  )
}

// --- 2. OrbitalRing: distant background decoration (desktop only) ---

const RING_URL = '/models/orbital-ring.glb'

export function OrbitalRing({ cyanBoostRef }: AssetProps) {
  const { scene } = useGLTF(RING_URL)
  const groupRef = useRef<THREE.Group>(null)

  const clonedScene = useMemo(() => scene.clone(), [scene])

  const emissiveMats = useMemo(() => {
    const mats: THREE.MeshStandardMaterial[] = []
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial
        if (mat.emissive && mat.emissive.getHex() !== 0x000000) {
          mats.push(mat)
        }
        // Make semi-transparent
        mat.transparent = true
        mat.opacity = 0.6
      }
    })
    return mats
  }, [clonedScene])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.elapsedTime
    const boost = cyanBoostRef.current

    // Very slow rotation
    groupRef.current.rotation.y = t * 0.02
    groupRef.current.rotation.z = Math.sin(t * 0.01) * 0.1

    emissiveMats.forEach((mat) => {
      mat.emissiveIntensity = 1.5 * boost
    })
  })

  return (
    <group ref={groupRef} position={[4, 3, -5]} scale={3}>
      <primitive object={clonedScene} />
    </group>
  )
}

// --- 3. TinyWanderers: stand at 4 corners of the castle (inside innerGroup) ---

const WANDERER_URL = '/models/tiny-wanderer.glb'

interface WandererConfig {
  position: [number, number, number]
  facingAngle: number  // Y rotation to face outward
  phaseOffset: number  // stagger sway & light flicker
}

const WANDERER_POSITIONS: WandererConfig[] = [
  { position: [0.0, -0.115, 0.58],   facingAngle: Math.PI * 0.0,  phaseOffset: 0 },       // front
  { position: [0.0, -0.116, -0.58],  facingAngle: Math.PI * 1.0,  phaseOffset: 1.5 },     // back
  { position: [0.55, -0.1, 0.0],   facingAngle: Math.PI * 0.5,  phaseOffset: 3.0 },     // right
  { position: [-0.55, -0.1, 0.0],  facingAngle: Math.PI * 1.5,  phaseOffset: 4.5 },     // left
]

function SingleWanderer({ config, cyanBoostRef }: { config: WandererConfig; cyanBoostRef: MutableRefObject<number> }) {
  const { scene, animations } = useGLTF(WANDERER_URL)
  const groupRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)

  // SkeletonUtils.clone preserves SkinnedMesh bone bindings
  const clonedScene = useMemo(() => skeletonClone(scene), [scene])

  // Manual AnimationMixer bound directly to cloned scene
  useEffect(() => {
    if (!clonedScene || animations.length === 0) return

    const mixer = new THREE.AnimationMixer(clonedScene)
    const clip = animations[0]
    const action = mixer.clipAction(clip)
    action.timeScale = 0.8
    action.time = config.phaseOffset
    action.play()
    mixerRef.current = mixer

    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(clonedScene)
      mixerRef.current = null
    }
  }, [clonedScene, animations, config.phaseOffset])

  useFrame(({ clock }, delta) => {
    // Update animation mixer
    mixerRef.current?.update(delta)

    if (!groupRef.current) return
    const t = clock.elapsedTime
    const boost = cyanBoostRef.current
    const phase = config.phaseOffset

    // Face outward direction
    groupRef.current.rotation.y = config.facingAngle

    // Flickering staff light
    if (lightRef.current) {
      lightRef.current.intensity = (3.0 + Math.sin(t * 2 + phase) * 1.5) * boost
    }
  })

  return (
    <group
      ref={groupRef}
      position={config.position}
      scale={0.03}
    >
      <primitive object={clonedScene} />
      <pointLight
        ref={lightRef}
        color="#00e5ff"
        intensity={3.0}
        distance={2.5}
        decay={2}
        position={[0, 12, 2]}
      />
    </group>
  )
}

export function TinyWanderer({ cyanBoostRef }: AssetProps) {
  return (
    <>
      {WANDERER_POSITIONS.map((config, i) => (
        <SingleWanderer key={i} config={config} cyanBoostRef={cyanBoostRef} />
      ))}
    </>
  )
}

// --- 4. MechanicalBirds: multiple birds flying around ---

const BIRD_URL = '/models/mechanical-bird.glb'

interface BirdConfig {
  orbitRadius: number
  orbitSpeed: number
  heightBase: number
  heightAmp: number
  phaseOffset: number
}

function SingleBird({ config, cyanBoostRef }: { config: BirdConfig; cyanBoostRef: MutableRefObject<number> }) {
  const { scene } = useGLTF(BIRD_URL)
  const groupRef = useRef<THREE.Group>(null)

  const clonedScene = useMemo(() => scene.clone(), [scene])

  const emissiveMats = useMemo(() => {
    const mats: THREE.MeshStandardMaterial[] = []
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial
        if (mat.emissive && mat.emissive.getHex() !== 0x000000) {
          mats.push(mat)
        }
      }
    })
    return mats
  }, [clonedScene])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.elapsedTime
    const boost = cyanBoostRef.current
    const { orbitRadius, orbitSpeed, heightBase, heightAmp, phaseOffset } = config

    const angle = t * orbitSpeed + phaseOffset
    groupRef.current.position.set(
      Math.cos(angle) * orbitRadius,
      heightBase + Math.sin(t * 0.8 + phaseOffset) * heightAmp,
      Math.sin(angle) * orbitRadius,
    )
    // Face flying direction + wing flap tilt
    groupRef.current.rotation.y = -angle - Math.PI * 0.5
    groupRef.current.rotation.z = Math.sin(t * 4 + phaseOffset) * 0.15

    emissiveMats.forEach((mat) => {
      mat.emissiveIntensity = 2.0 * boost
    })
  })

  return (
    <group ref={groupRef} scale={0.035}>
      <primitive object={clonedScene} />
    </group>
  )
}

const BIRD_CONFIGS: BirdConfig[] = [
  { orbitRadius: 1.5, orbitSpeed: 0.25, heightBase: 0.8, heightAmp: 0.2, phaseOffset: 0 },
  { orbitRadius: 1.8, orbitSpeed: 0.20, heightBase: 1.2, heightAmp: 0.3, phaseOffset: Math.PI * 0.7 },
  { orbitRadius: 1.3, orbitSpeed: 0.30, heightBase: 0.6, heightAmp: 0.15, phaseOffset: Math.PI * 1.3 },
  { orbitRadius: 2.0, orbitSpeed: 0.18, heightBase: 1.5, heightAmp: 0.3, phaseOffset: Math.PI * 0.4 },
  { orbitRadius: 1.6, orbitSpeed: 0.22, heightBase: 1.0, heightAmp: 0.25, phaseOffset: Math.PI * 1.8 },
]

export function MechanicalBirds({ cyanBoostRef, isMobile }: AssetProps & { isMobile: boolean }) {
  const count = isMobile ? 3 : 5
  const configs = BIRD_CONFIGS.slice(0, count)

  return (
    <>
      {configs.map((config, i) => (
        <SingleBird key={i} config={config} cyanBoostRef={cyanBoostRef} />
      ))}
    </>
  )
}

// --- Preload all assets ---
useGLTF.preload(DRONE_URL)
useGLTF.preload(RING_URL)
useGLTF.preload(WANDERER_URL)
useGLTF.preload(BIRD_URL)
