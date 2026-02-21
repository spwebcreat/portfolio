import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'
import styl from './index.module.styl'

// --- Data ---

export const SKILL_CRYSTALS = [
  {
    id: 'code-tablet',
    model: '/models/crystal-code-tablet.glb',
    position: [1.00, 0.10, 0.57] as const,
    title: 'Frontend',
    description: 'HTML/CSS/JS/TSによるモダンフロントエンド開発',
    tags: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'Three.js', 'TailwindCSS'],
    emissiveBase: 6.5,
    lightColor: '#00e5ff',
  },
  {
    id: 'ai-cube',
    model: '/models/crystal-ai-cube.glb',
    position: [-1.00, 0.30, 0.84] as const,
    title: 'AI連携',
    description: 'Claude API / Gemini APIを活用したAI機能開発',
    tags: ['Claude API', 'Gemini API'],
    emissiveBase: 6.0,
    lightColor: '#22d3ee',
  },
  {
    id: 'gear-nature',
    model: '/models/crystal-gear-nature.glb',
    position: [-0.92, -0.10, -0.77] as const,
    title: 'CMS / Framework',
    description: 'WordPress構築・プラグイン開発・CMS自動化・Next.jsなどのフレームワーク経験',
    tags: ['WordPress', 'PHP', 'REST API', 'カスタムテーマ'],
    emissiveBase: 2.0,
    lightColor: '#22d3ee',
  },
  {
    id: 'database',
    model: '/models/crystal-database.glb',
    position: [0.93, 0.50, -1.11] as const,
    title: 'Database / Infra',
    description: 'データベース設計からインフラ構築まで',
    tags: ['MySQL', 'PostgreSQL', 'Supabase', 'Firebase', 'Docker', 'Vercel'],
    emissiveBase: 5.0,
    lightColor: '#22d3ee',
  },
  {
    id: 'hologram-disc',
    model: '/models/crystal-hologram-disc.glb',
    position: [0.00, -0.25, 1.60] as const,
    title: 'Design',
    description: 'ユーザー体験を重視したUI/UX/WEBデザイン',
    tags: ['Figma', 'レスポンシブ', 'アクセシビリティ'],
    emissiveBase: 2.5,
    lightColor: '#22d3ee',
  },
] as const

export type SkillCrystalData = (typeof SKILL_CRYSTALS)[number]

// --- Component ---

interface SkillCrystalProps {
  id: string
  model: string
  position: readonly [number, number, number]
  title: string
  emissiveBase: number
  lightColor: string
  index: number
  isActive: boolean
  onActivate: (id: string | null) => void
}

export function SkillCrystal({
  id, model, position, title, emissiveBase, lightColor,
  index, isActive, onActivate,
}: SkillCrystalProps) {
  const { scene } = useGLTF(model)
  const meshRef = useRef<THREE.Group>(null)
  const pointLightRef = useRef<THREE.PointLight>(null)

  const clonedScene = useMemo(() => scene.clone(), [scene])

  const emissiveMats = useMemo(() => {
    const mats: THREE.MeshStandardMaterial[] = []

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial

        // ホログラムディスクのみ: 白すぎる面を暗く補正
        if (id === 'hologram-disc' && mat.color) {
          const hsl = { h: 0, s: 0, l: 0 }
          mat.color.getHSL(hsl)
          if (hsl.l > 0.6) {
            mat.color.setHSL(0.52, 0.25, 0.15)
            mat.opacity = 0.7
            mat.transparent = true
          }
        }

        // モデル元々の emissive カラーを保持し、非黒のみパルス対象
        if (mat.emissive && mat.emissive.getHex() !== 0x000000) {
          mats.push(mat)
        }
      }
    })
    return mats
  }, [clonedScene, id])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.elapsedTime

    // 浮遊アニメーション
    meshRef.current.position.y =
      position[1] + Math.sin(t * 0.8 + index * 1.2) * 0.03

    // ゆっくり自転
    meshRef.current.rotation.y += 0.002 * (index % 2 === 0 ? 1 : -1)

    // 脈動する発光（振幅拡大）
    const pulse = emissiveBase + Math.sin(t * 1.5 + index * 1.8) * 1.8
    const intensity = isActive ? pulse * 2.0 : pulse
    emissiveMats.forEach((mat) => {
      mat.emissiveIntensity = intensity
    })

    // pointLight も連動
    if (pointLightRef.current) {
      pointLightRef.current.intensity = isActive ? 4.0 : 2.0
      pointLightRef.current.distance = isActive ? 1.5 : 1.2
    }
  })

  return (
    <group
      ref={meshRef}
      position={[position[0], position[1], position[2]]}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default'
      }}
      onClick={(e) => {
        e.stopPropagation()
        onActivate(isActive ? null : id)
      }}
      scale={isActive ? 0.14 : 0.12}
    >
      <primitive object={clonedScene} />

      {/* 結晶ごとの小型ポイントライト */}
      <pointLight
        ref={pointLightRef}
        color={lightColor}
        intensity={2.0}
        distance={1.2}
        decay={2}
        position={[0, 0.1, 0]}
      />

      {/* 常時表示ラベル */}
      <Html
        position={[0, 2.5, 0]}
        center
        sprite
        distanceFactor={3}
        style={{ pointerEvents: 'none' }}
      >
        <span
          className={styl.crystalLabel}
          data-active={isActive || undefined}
        >
          {title}
        </span>
      </Html>
    </group>
  )
}

// 全結晶を事前ロード
SKILL_CRYSTALS.forEach((c) => useGLTF.preload(c.model))
