import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMobile } from './ScaleAssets'

interface RainParticlesProps {
  intensity: number
  windSpeed: number
}

export function RainParticles({ intensity, windSpeed }: RainParticlesProps) {
  const meshRef = useRef<THREE.Points>(null)
  const isMobile = useMobile()
  const maxCount = isMobile ? 400 : 800

  const particles = useMemo(() => {
    const positions = new Float32Array(maxCount * 3)
    const velocities = new Float32Array(maxCount)
    for (let i = 0; i < maxCount; i++) {
      resetRainDrop(positions, velocities, i, true)
    }
    return { positions, velocities }
  }, [maxCount])

  useFrame((_, delta) => {
    // Early return when no rain
    if (intensity <= 0.01) {
      if (meshRef.current) meshRef.current.visible = false
      return
    }
    if (meshRef.current) meshRef.current.visible = true

    const { positions, velocities } = particles
    const activeCount = Math.floor(maxCount * Math.min(intensity, 1.0))
    // Wind drift: normalize windSpeed (km/h) to a small horizontal offset
    const windDrift = (windSpeed / 50) * 0.5 * delta

    for (let i = 0; i < maxCount; i++) {
      const i3 = i * 3
      if (i >= activeCount) {
        // Park inactive particles off-screen
        positions[i3 + 1] = -100
        continue
      }

      // Fall
      positions[i3 + 1] -= velocities[i] * delta
      // Wind
      positions[i3] += windDrift

      // Reset when below ground
      if (positions[i3 + 1] < -1.5) {
        resetRainDrop(positions, velocities, i, false)
      }
    }

    if (meshRef.current) {
      meshRef.current.geometry.attributes.position.needsUpdate = true
      const mat = meshRef.current.material as THREE.PointsMaterial
      mat.opacity = 0.4 * Math.min(intensity, 1.0)
    }
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={particles.positions}
          count={maxCount}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color="#a0c8e8"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

function resetRainDrop(
  positions: Float32Array,
  velocities: Float32Array,
  i: number,
  randomY: boolean,
) {
  const i3 = i * 3
  // XZ: spread around castle area
  positions[i3] = (Math.random() - 0.5) * 8     // X: -4 to 4
  positions[i3 + 1] = randomY
    ? Math.random() * 8 - 1.5                     // Initial random spread
    : 4 + Math.random() * 2                       // Reset: above scene (4 to 6)
  positions[i3 + 2] = (Math.random() - 0.5) * 8 // Z: -4 to 4
  // Fall speed: 3.0 to 5.0 units/s
  velocities[i] = 3.0 + Math.random() * 2.0
}
