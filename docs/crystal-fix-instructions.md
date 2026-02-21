# 結晶の修正指示

## 修正1: ホログラムディスクの色味修正

ホログラムディスク（crystal-hologram-disc.glb）の中央のホログラム面が
白〜水色で浮いて見えている。他の結晶と同様にダーク＆クールなトーンに揃えたい。

### 対応方法

R3F側でマテリアルを上書きして色味を調整する。
GLBを差し替えなくても、読み込み後にマテリアルを動的に変更できる。

```tsx
// ホログラムディスクだけマテリアルを補正するuseEffect例
useEffect(() => {
  if (crystal.id === 'hologram-disc') {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial
        // 明るすぎる白系マテリアルを暗く補正
        if (mat.color) {
          const hsl = { h: 0, s: 0, l: 0 }
          mat.color.getHSL(hsl)
          // 明度が高い（白っぽい）部分を暗くし、シアン寄りに
          if (hsl.l > 0.5) {
            mat.color.setHSL(0.52, 0.3, hsl.l * 0.4) // シアン系の暗い色に
          }
        }
        // Emissiveをシアンに統一
        if (mat.emissive) {
          mat.emissive.set('#00e5ff')
          mat.emissiveIntensity = 0.8
        }
      }
    })
  }
}, [scene, crystal.id])
```

もしくは、より簡潔に:

```tsx
// SkillCrystal コンポーネント内でモデル読み込み後に補正
const { scene } = useGLTF(model)

useEffect(() => {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const mat = child.material as THREE.MeshStandardMaterial
      // 全結晶共通: emissiveをシアンに設定
      if (mat.emissive) {
        mat.emissive.set('#00e5ff')
      }
      // ホログラムディスクのみ: 白すぎる面を補正
      if (id === 'hologram-disc' && mat.color) {
        const hsl = { h: 0, s: 0, l: 0 }
        mat.color.getHSL(hsl)
        if (hsl.l > 0.6) {
          mat.color.setHSL(0.52, 0.25, 0.15)
          mat.opacity = 0.7
          mat.transparent = true
        }
      }
    }
  })
}, [scene, id])
```

---

## 修正2: 結晶の視認性向上

結晶が城から離れた位置にあるため、シーンのライティングが届かず暗く見える問題。
**結晶は「スキルの象徴」として目立つべきオブジェクト。** 暗闇の中でもシアンに自発光して存在感を出したい。

### 対応方法A: 各結晶にPointLightを追加（推奨）

各結晶の位置にシアン色のPointLightを配置して、
結晶自体を照らしつつ周囲にもほんのり光を漏らす。

```tsx
function SkillCrystal({ model, position, title, description, tags, emissiveIntensity, index, id }: SkillCrystalProps) {
  // ... 既存コード ...

  return (
    <group ref={meshRef} position={[position[0], position[1], position[2]]}>
      <primitive object={scene.clone()} />

      {/* 結晶を照らす専用PointLight */}
      <pointLight
        color="#00e5ff"
        intensity={3.0}
        distance={1.5}
        decay={2}
        position={[0, 0.1, 0]}
      />

      {/* ホバー時のツールチップ */}
      {hovered && (
        <Html center position={[0, 0.3, 0]} distanceFactor={3}>
          {/* ... */}
        </Html>
      )}
    </group>
  )
}
```

**PointLightのパラメータ:**
- `color="#00e5ff"` — シアンの光
- `intensity={3.0}` — 程よい明るさ（ホバー時は5.0に上げてもOK）
- `distance={1.5}` — 光の届く範囲を結晶周辺に限定（他に影響しない）
- `decay={2}` — 自然な減衰

### 対応方法B: Emissive強化（方法Aと併用推奨）

BlenderでEmissionが設定済みでも、R3F側でemissiveIntensityが足りない場合がある。
初回ロード時にEmissiveを強制的に設定する。

```tsx
useEffect(() => {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const mat = child.material as THREE.MeshStandardMaterial
      // Emissiveが未設定の場合も強制的にシアン発光を追加
      mat.emissive = new THREE.Color('#00e5ff')
      mat.emissiveIntensity = emissiveIntensity
      // マテリアルの更新を反映
      mat.needsUpdate = true
    }
  })
}, [scene, emissiveIntensity])
```

### 対応方法C: ホバー時の発光変化をより劇的に

```tsx
// useFrame内のホバー処理を強化
if (hovered) {
  mat.emissiveIntensity = emissiveIntensity * 2.5  // より強く光る
}

// PointLightもホバー連動
<pointLight
  color="#00e5ff"
  intensity={hovered ? 8.0 : 3.0}
  distance={hovered ? 2.0 : 1.5}
  decay={2}
  position={[0, 0.1, 0]}
/>
```

---

## まとめ: 推奨する修正の組み合わせ

1. **全結晶共通**: PointLight追加（方法A）+ Emissive強制設定（方法B）
2. **ホログラムディスクのみ**: 白い面の色味補正（修正1）
3. **ホバー時**: 発光とPointLight両方を強化（方法C）

この3つを組み合わせることで、
「暗闘の中でシアンに自発光する結晶がホバーでさらに輝く」
という演出になる。