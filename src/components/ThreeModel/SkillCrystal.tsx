import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'
import styl from './index.module.styl'

import skillsData from '@/data/skills.json'
import type { SkillEntry, OrbitParams } from '@/data/skillTypes'
export type { OrbitParams }

// --- Data ---

// 全クリスタル共通の公転速度（等間隔を維持するため統一）
export const SHARED_ORBIT_SPEED = 0.10 // rad/s

export const SKILL_CRYSTALS = (skillsData as SkillEntry[])
  .filter(s => s.crystal !== null)
  .map(s => ({
    id: s.id,
    model: s.crystal!.model,
    orbit: s.crystal!.orbit,
    title: s.title,
    description: s.description,
    tags: s.skillTags,
    emissiveBase: s.crystal!.emissiveBase,
    lightColor: s.crystal!.lightColor,
  }))

export type SkillCrystalData = (typeof SKILL_CRYSTALS)[number]

// --- Component ---

interface SkillCrystalProps {
  id: string
  model: string
  orbit: OrbitParams
  title: string
  emissiveBase: number
  lightColor: string
  index: number
  isActive: boolean
  anyActive: boolean // いずれかのクリスタルがアクティブ→全体減速
  onActivate: (id: string | null) => void
}

export function SkillCrystal({
  id, model, orbit, title, emissiveBase, lightColor,
  index, isActive, anyActive, onActivate,
}: SkillCrystalProps) {
  const { scene } = useGLTF(model)
  const meshRef = useRef<THREE.Group>(null)
  const pointLightRef = useRef<THREE.PointLight>(null)
  // 等間隔: index × (360°/N) で初期位相を設定
  const N = SKILL_CRYSTALS.length
  const angleRef = useRef(index * (2 * Math.PI / N))
  const velocityRef = useRef(SHARED_ORBIT_SPEED)

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

  // 傾斜軌道の事前計算値
  const tiltRad = useMemo(() => orbit.tilt * (Math.PI / 180), [orbit.tilt])
  const tiltDirRad = useMemo(() => orbit.tiltDir * (Math.PI / 180), [orbit.tiltDir])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.elapsedTime

    // 角速度のスムーズ遷移（いずれかがactive→全体減速で等間隔維持）
    const targetVelocity = anyActive ? 0 : SHARED_ORBIT_SPEED
    velocityRef.current += (targetVelocity - velocityRef.current) * 0.05

    // 角度を更新
    angleRef.current += velocityRef.current * (1 / 60) // 約60fpsを想定

    // 傾斜軌道の位置計算
    const angle = angleRef.current
    const baseX = orbit.radius * Math.cos(angle)
    const baseZ = orbit.radius * Math.sin(angle)

    // 傾斜を適用
    const tiltedY = orbit.height + baseZ * Math.sin(tiltRad)
    const tiltedZ = baseZ * Math.cos(tiltRad)

    // tiltDir でY軸回転して最終位置を算出
    const cosDir = Math.cos(tiltDirRad)
    const sinDir = Math.sin(tiltDirRad)
    const finalX = baseX * cosDir - tiltedZ * sinDir
    const finalZ = baseX * sinDir + tiltedZ * cosDir

    meshRef.current.position.set(
      finalX,
      tiltedY + Math.sin(t * 0.8 + index * 1.2) * 0.03, // 浮遊アニメーション
      finalZ,
    )

    // ゆっくり自転
    meshRef.current.rotation.y += 0.002 * (index % 2 === 0 ? 1 : -1)

    // 脈動する発光（振幅拡大）
    const pulse = emissiveBase + Math.sin(t * 1.5 + index * 1.8) * 0.8
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
