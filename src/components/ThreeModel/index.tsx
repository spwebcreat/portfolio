import React, { useRef, useState, useCallback, useEffect, Suspense } from "react";
import { useScroll, useTransform } from 'framer-motion';
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Float,
  Cloud,
  Stars,
  Sparkles,
} from "@react-three/drei";
import { motion as motion3d } from "framer-motion-3d";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { SkillCrystal, SKILL_CRYSTALS } from './SkillCrystal';
import { CastleReactions } from './CastleReactions';
import { DroneScout, OrbitalRing, MechanicalBirds, getScrollCyanBoost, useMobile } from './ScaleAssets';
import LoadingGlitch from './LoadingGlitch';
import styl from './index.module.styl';

// Draco デコーダーの設定（floating-castle.glb はDraco圧縮済み）
useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const MODEL_URL = '/models/floating-castle-v5.glb';
const CRYSTAL_URL = '/models/castle-crystal.glb';

// ====== ライティング基準値（全体の明るさ調整はここ） ======
// TIME_CONFIG のカーブ形状はそのまま、この乗数で一括スケール
const AMBIENT_BASE = 5.0;  // 環境光 — 上げると全体が明るく
const DIR_BASE     = 5.0;  // 太陽光 — 上げると陰影コントラスト強く
const CYAN_BASE    = 1.0;  // シアン発光 — 上げると夜間グロウ強く
// ===========================================================

// スクロール時間変化の設定（朝→昼→夕→夜→深夜）
const TIME_CONFIG = [
  { at: 0.00, ambient: new THREE.Color('#fff5e0'), intensity: 0.8, dirIntensity: 2.0, cyanIntensity: 3 },
  { at: 0.25, ambient: new THREE.Color('#ffffff'), intensity: 1.0, dirIntensity: 2.5, cyanIntensity: 3 },
  { at: 0.50, ambient: new THREE.Color('#ff8c42'), intensity: 0.7, dirIntensity: 1.5, cyanIntensity: 5 },
  { at: 0.75, ambient: new THREE.Color('#e5e5ff'), intensity: 0.3, dirIntensity: 0.5, cyanIntensity: 8 },
  { at: 1.00, ambient: new THREE.Color('#ffd500'), intensity: 0.15, dirIntensity: 0.2, cyanIntensity: 12 },
];

// 2つのタイムポイント間を補間するユーティリティ
function lerpTimeConfig(scroll: number) {
  let lower = TIME_CONFIG[0];
  let upper = TIME_CONFIG[TIME_CONFIG.length - 1];
  for (let i = 0; i < TIME_CONFIG.length - 1; i++) {
    if (scroll >= TIME_CONFIG[i].at && scroll <= TIME_CONFIG[i + 1].at) {
      lower = TIME_CONFIG[i];
      upper = TIME_CONFIG[i + 1];
      break;
    }
  }
  const range = upper.at - lower.at || 1;
  const t = (scroll - lower.at) / range;
  return {
    ambient: lower.ambient.clone().lerp(upper.ambient, t),
    intensity: THREE.MathUtils.lerp(lower.intensity, upper.intensity, t),
    dirIntensity: THREE.MathUtils.lerp(lower.dirIntensity, upper.dirIntensity, t),
    cyanIntensity: THREE.MathUtils.lerp(lower.cyanIntensity, upper.cyanIntensity, t),
  };
}

// --- リアルタイム連動 レイヤー1: 時間帯 ---

interface TimeState {
  period: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night'
  ambientIntensity: number
  cyanBoost: number
}

function getTimeState(): TimeState {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 8) return {
    period: 'dawn', ambientIntensity: 0.75, cyanBoost: 0.4,
  }
  if (hour >= 8 && hour < 12) return {
    period: 'morning', ambientIntensity: 1.0, cyanBoost: 0.2,
  }
  if (hour >= 12 && hour < 17) return {
    period: 'afternoon', ambientIntensity: 0.9, cyanBoost: 0.3,
  }
  if (hour >= 17 && hour < 20) return {
    period: 'evening', ambientIntensity: 0.6, cyanBoost: 0.7,
  }
  return {
    period: 'night', ambientIntensity: 0.3, cyanBoost: 1.0,
  }
}

function useTimeOfDay() {
  const [state, setState] = useState(() => getTimeState())
  useEffect(() => {
    const interval = setInterval(() => setState(getTimeState()), 1800000) // 30分ごと
    return () => clearInterval(interval)
  }, [])
  return state
}

// マウス追従パララックス
const MouseParallax = () => {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const basePos = useRef(new THREE.Vector3(0, 0, 10));

  React.useEffect(() => {
    basePos.current.copy(camera.position);
    const onMove = (e: MouseEvent) => {
      // -0.5〜0.5 に正規化
      mouse.current.x = (e.clientX / window.innerWidth - 0.5);
      mouse.current.y = (e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [camera]);

  useFrame(() => {
    // マウス位置に応じてカメラを微妙にずらす（lerp でなめらかに追従）
    const targetX = basePos.current.x + mouse.current.x * 0.8;
    const targetY = basePos.current.y - mouse.current.y * 0.4;
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
  });

  return null;
};

// スクロール時間変化 + リアルタイム時間帯 + シアン脈動を制御するコンポーネント
const SceneLighting = ({
  scrollYProgress,
  activeCrystalId,
  timeLightingEnabled,
}: {
  scrollYProgress: any
  activeCrystalId: string | null
  timeLightingEnabled: boolean
}) => {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const cyanRef = useRef<THREE.PointLight>(null);
  const timeOfDay = useTimeOfDay();

  const scrollRef = useRef(0);
  React.useEffect(() => {
    return scrollYProgress.on('change', (v: number) => { scrollRef.current = v; });
  }, [scrollYProgress]);

  // Database active 時のシアン増幅
  const dbBoostRef = useRef(0);

  useFrame(({ clock }) => {
    const scroll = scrollRef.current;
    const scrollTime = lerpTimeConfig(scroll);

    // DB boost lerp
    const targetBoost = activeCrystalId === 'database' ? 3.0 : 1.0;
    dbBoostRef.current += (targetBoost - dbBoostRef.current) * 0.05;

    // 時刻連動ライティングの適用倍率（OFF 時はニュートラル値）
    const ambientMul = timeLightingEnabled ? timeOfDay.ambientIntensity : 1.0;
    const cyanMul = timeLightingEnabled ? (0.5 + timeOfDay.cyanBoost * 0.5) : 0.5;

    // 環境光: 基準値 × スクロール時間変化 × リアルタイム時間帯
    if (ambientRef.current) {
      ambientRef.current.color.copy(scrollTime.ambient);
      ambientRef.current.intensity = AMBIENT_BASE * scrollTime.intensity * ambientMul;
    }

    // 方向光: 基準値 × スクロール時間変化 × リアルタイム時間帯
    if (dirRef.current) {
      dirRef.current.intensity = DIR_BASE * scrollTime.dirIntensity * ambientMul;
    }

    // シアン発光: 基準値 × スクロール時間変化 × リアルタイムcyanBoost × 脈動 × DB boost
    if (cyanRef.current) {
      const pulse = Math.sin(clock.elapsedTime * 1.2) * 0.3 + 1; // 0.7〜1.3
      cyanRef.current.intensity = CYAN_BASE * scrollTime.cyanIntensity * cyanMul * pulse * dbBoostRef.current;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={1.5} color="#e8f4ff" />
      <directionalLight ref={dirRef} position={[5, 8, 3]} intensity={2} color="#ffffff" />
      <pointLight
        ref={cyanRef}
        position={[0, -0.55, 0]}
        color="#00e5ff"
        intensity={3}
        distance={3}
        decay={2}
      />
    </>
  );
};

// 星空背景（夜になると浮かび上がる）
const NightSky = ({ scrollYProgress }: { scrollYProgress: any }) => {
  const starsRef = useRef<THREE.Group>(null);
  const scrollRef = useRef(0);

  React.useEffect(() => {
    return scrollYProgress.on('change', (v: number) => { scrollRef.current = v; });
  }, [scrollYProgress]);

  // visible で確実に表示/非表示を制御
  useFrame(() => {
    if (!starsRef.current) return;
    starsRef.current.visible = scrollRef.current > 0.4;
  });

  return (
    <group ref={starsRef} visible={false}>
      <Stars
        radius={50}
        depth={30}
        count={3000}
        factor={3}
        saturation={0.2}
        fade
        speed={0.5}
      />
    </group>
  );
};

// 城の塔上に配置するクリスタル（スクロール連動発光 + 回転 + 浮遊）
const CastleCrystals = ({ scrollYProgress }: { scrollYProgress: any }) => {
  const { scene } = useGLTF(CRYSTAL_URL);
  const ref1 = useRef<THREE.Group>(null);
  const ref2 = useRef<THREE.Group>(null);
  const scrollRef = useRef(0);

  const clone1 = React.useMemo(() => scene.clone(true), [scene]);
  const clone2 = React.useMemo(() => scene.clone(true), [scene]);

  React.useEffect(() => {
    return scrollYProgress.on('change', (v: number) => { scrollRef.current = v; });
  }, [scrollYProgress]);

  // GLB 内ジオメトリのバウンディングボックス中心（焼き込み座標）
  // 回転軸を自身の中心にするため、primitive にオフセットを掛けて原点にセンタリング
  const GEO_OFFSET: [number, number, number] = [0.713, -0.293, -0.019];

  // 配置位置（R3F 座標系）— 目視で微調整可
  const POSITIONS: [number, number, number][] = [
    [-0.74, 0.14, 0.04],  // 左塔 x , y , z
    [0.738, 0.12, 0.02],   // 右塔
  ];

  useFrame(({ clock }) => {
    const scroll = scrollRef.current;
    const t = clock.elapsedTime;

    // スクロール連動 emissive: 1.5（朝・常時グロウ）→ 3.5（深夜・強烈）
    const scrollBase = 1.5 + scroll * 2.0;
    // 脈動（シアン pointLight と同リズム）
    const pulse = Math.sin(t * 1.2) * 0.3 + 1;
    const emissiveIntensity = scrollBase * pulse;

    [ref1, ref2].forEach((ref, i) => {
      if (!ref.current) return;
      // マテリアルの emissiveIntensity を更新
      ref.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            mat.emissiveIntensity = emissiveIntensity;
          }
        }
      });
      // ゆっくり回転
      ref.current.rotation.y += 0.005;
      // 浮遊（2つ目はフェーズをずらす）
      const phaseOffset = i * 1.5;
      ref.current.position.y = POSITIONS[i][1] + Math.sin((t + phaseOffset) * 0.8) * 0.003;
    });
  });

  return (
    <>
      <group ref={ref1} position={POSITIONS[0]} scale={1.8}>
        <primitive object={clone1} position={GEO_OFFSET} />
      </group>
      <group ref={ref2} position={POSITIONS[1]} scale={1.8}>
        <primitive object={clone2} position={GEO_OFFSET} />
      </group>
    </>
  );
};

const Model = ({
  scrollYProgress,
  activeCrystalId,
  onActivateCrystal,
  cyanBoostRef,
}: {
  scrollYProgress: any
  activeCrystalId: string | null
  onActivateCrystal: (id: string | null) => void
  cyanBoostRef: React.MutableRefObject<number>
}) => {
  const group = useRef<THREE.Group>(null);
  const innerGroupRef = useRef<THREE.Group>(null);
  const { nodes, materials } = useGLTF(MODEL_URL) as any;
  const rotationY = useTransform(scrollYProgress, [0, 1], [0, Math.PI * 0.8]);

  // emissive リセット（Mat_Cyan_Glow / Mat_Crystal は発光を維持するためスキップ）
  React.useEffect(() => {
    Object.values(materials).forEach((mat) => {
      const m = mat as THREE.MeshStandardMaterial;
      if (m.name === 'Mat_Cyan_Glow' || m.name === 'Mat_Crystal') return;
      m.emissive.set('#000000');
      m.emissiveIntensity = 0;
      m.needsUpdate = true;
    });
  }, [materials]);

  // Mat_Cyan_Glow の脈動（SceneLighting のシアン脈動と同じリズム）
  const glowMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  // Mat_Crystal のスクロール連動発光
  const crystalMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  React.useEffect(() => {
    const glowMat = Object.values(materials).find(
      (m) => (m as THREE.MeshStandardMaterial).name === 'Mat_Cyan_Glow'
    ) as THREE.MeshStandardMaterial | undefined;
    glowMatRef.current = glowMat ?? null;

    const crystalMat = Object.values(materials).find(
      (m) => (m as THREE.MeshStandardMaterial).name === 'Mat_Crystal'
    ) as THREE.MeshStandardMaterial | undefined;
    crystalMatRef.current = crystalMat ?? null;
  }, [materials]);

  // スクロール値・速度を ref で追跡
  const scrollRef = useRef(0);
  const prevScrollRef = useRef(0);
  const scrollVelocityRef = useRef(0);
  React.useEffect(() => {
    return scrollYProgress.on('change', (v: number) => { scrollRef.current = v; });
  }, [scrollYProgress]);

  // リアルタイム時間帯（夜ほどクリスタルが輝く）
  const timeOfDay = useTimeOfDay();

  useFrame(({ clock }) => {
    const pulse = Math.sin(clock.elapsedTime * 1.2) * 0.3 + 1; // 0.7〜1.3

    // Mat_Cyan_Glow: emissiveIntensity を 0.3〜0.8 でゆらす
    if (glowMatRef.current) {
      glowMatRef.current.emissiveIntensity = 0.3 + pulse * 0.25;
    }

    // --- Mat_Crystal: スクロール位置 × 加速度 × 時間帯 で発光制御 ---
    if (crystalMatRef.current) {
      // 1) emissive色をGLB元のシアンに復帰
      crystalMatRef.current.emissive.set('#00e5ff');

      // 2) スクロール位置ベース（朝 0.3 → 深夜 3.0）
      const scroll = scrollRef.current;
      const scrollBase = 0.3 + scroll * 2.7;

      // 3) スクロール加速度ブースト（速く動かすほど光が増す）
      const rawVelocity = Math.abs(scroll - prevScrollRef.current) * 100;
      prevScrollRef.current = scroll;
      // なめらかに追従（急に消えない）
      scrollVelocityRef.current += (rawVelocity - scrollVelocityRef.current) * 0.08;
      const velocityBoost = 1.0 + Math.min(scrollVelocityRef.current * 4, 5.0); // 1.0〜6.0

      // 4) 時間帯倍率（朝 0.6x → 夜 1.5x）
      const timeMul = 0.6 + timeOfDay.cyanBoost * 0.9;

      // 5) 脈動（速度が高いほど脈動も速くなる）
      const pulseSpeed = 1.2 + scrollVelocityRef.current * 3;
      const crystalPulse = Math.sin(clock.elapsedTime * pulseSpeed) * 0.3 + 1;

      // 最終: scrollBase × velocityBoost × timeMul × pulse
      crystalMatRef.current.emissiveIntensity = scrollBase * velocityBoost * timeMul * crystalPulse;
    }
  });

  return (
    <motion3d.group ref={group as any} rotation-y={rotationY}>
      <group ref={innerGroupRef} position={[0, -0.2, 0]}>
        {/* 城＋岩盤（Mesh_0 一体構造） */}
        <primitive object={nodes.Mesh_0} />
        {/* 塔上クリスタル（スクロール連動発光） */}
        <CastleCrystals scrollYProgress={scrollYProgress} />
        {/* 城リアクション */}
        <CastleReactions
          activeCrystalId={activeCrystalId}
          innerGroupRef={innerGroupRef}
        />
        {/* スキルの結晶 */}
        <Suspense fallback={null}>
          {SKILL_CRYSTALS.map((crystal, i) => (
            <SkillCrystal
              key={crystal.id}
              index={i}
              id={crystal.id}
              model={crystal.model}
              orbit={crystal.orbit}
              title={crystal.title}
              emissiveBase={crystal.emissiveBase}
              lightColor={crystal.lightColor}
              isActive={activeCrystalId === crystal.id}
              anyActive={activeCrystalId !== null}
              onActivate={onActivateCrystal}
            />
          ))}
        </Suspense>
      </group>
    </motion3d.group>
  );
};

// --- Bloom 除外レイヤー ---
// レイヤー11 のオブジェクトはブルームパスに含まれず、別パスで描画される
const BLOOM_EXCLUDE_LAYER = 11;

// 子要素をレイヤー11 に移してブルーム対象から除外するラッパー
const BloomExcluded = ({ children }: { children: React.ReactNode }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.traverse((obj) => obj.layers.set(BLOOM_EXCLUDE_LAYER));
  });
  return <group ref={groupRef}>{children}</group>;
};

// ブルーム後にレイヤー11 を手動描画するコンポーネント
const AfterBloomRenderer = () => {
  const { gl, scene, camera } = useThree();
  useFrame(() => {
    const savedMask = camera.layers.mask;
    camera.layers.set(BLOOM_EXCLUDE_LAYER);
    gl.autoClear = false;
    gl.clear(false, true, false); // depth のみクリア
    gl.render(scene, camera);
    camera.layers.mask = savedMask;
    gl.autoClear = true;
  }, 2); // priority 2: EffectComposer（priority 1）の後に実行
  return null;
};

// スクロール速度連動パーティクル
const ScrollSparkles = ({ scrollYProgress }: { scrollYProgress: any }) => {
  const groupRef = useRef<THREE.Group>(null);
  const scrollRef = useRef(0);
  const prevScroll = useRef(0);
  const velocityRef = useRef(0);

  React.useEffect(() => {
    return scrollYProgress.on('change', (v: number) => { scrollRef.current = v; });
  }, [scrollYProgress]);

  useFrame(() => {
    if (!groupRef.current) return;
    // スクロール速度を計算（前フレームとの差分）
    const rawVelocity = Math.abs(scrollRef.current - prevScroll.current) * 100;
    prevScroll.current = scrollRef.current;
    // なめらかに追従（急に消えない）
    velocityRef.current += (rawVelocity - velocityRef.current) * 0.1;
    // 速度に応じて opacity を 0.05（静止時）〜 1.0（高速スクロール時）に
    const opacity = Math.min(1.0, 0.05 + velocityRef.current * 3);
    groupRef.current.traverse((child) => {
      if ((child as any).material) {
        (child as any).material.opacity = opacity;
      }
    });
  });

  return (
    <group ref={groupRef}>
      <Sparkles
        count={300}
        scale={10}
        size={6}
        speed={0.4}
        opacity={0.5}
        color="#00e5ff"
      />
    </group>
  );
};

// cyanBoostRef をスクロール進行度に連動させるドライバー
const CyanBoostDriver = ({
  scrollYProgress,
  cyanBoostRef,
}: {
  scrollYProgress: any
  cyanBoostRef: React.MutableRefObject<number>
}) => {
  const scrollRef = useRef(0);

  React.useEffect(() => {
    return scrollYProgress.on('change', (v: number) => { scrollRef.current = v; });
  }, [scrollYProgress]);

  useFrame(() => {
    cyanBoostRef.current = getScrollCyanBoost(scrollRef.current);
  });

  return null;
};

useGLTF.preload(MODEL_URL);
useGLTF.preload(CRYSTAL_URL);

// カメラ reveal 演出（パン & ズーム）
const CAMERA_START = new THREE.Vector3(3, 4, 16);
const CAMERA_END = new THREE.Vector3(0, 0.5, 3);

const CameraReveal = ({ phase }: { phase: 'loading' | 'fog' | 'ready' }) => {
  const { camera } = useThree();
  const startedRef = useRef(false);
  const doneRef = useRef(false);
  const tmpVec = useRef(new THREE.Vector3());

  // Set camera to start position on mount
  useEffect(() => {
    camera.position.copy(CAMERA_START);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useFrame(() => {
    if (doneRef.current) return;

    if (phase === 'loading') {
      // Hold at start position with subtle drift
      camera.position.copy(CAMERA_START);
      camera.lookAt(0, 0, 0);
      return;
    }

    if (phase === 'fog' || phase === 'ready') {
      if (!startedRef.current) {
        startedRef.current = true;
      }

      // Smooth lerp toward final position
      tmpVec.current.copy(CAMERA_END);
      camera.position.lerp(tmpVec.current, 0.025);
      camera.lookAt(0, 0, 0);

      // Check if close enough to hand off to OrbitControls
      const dist = camera.position.distanceTo(CAMERA_END);
      if (dist < 0.05) {
        camera.position.copy(CAMERA_END);
        doneRef.current = true;
      }
    }
  });

  return null;
};

// --- 2D Detail Panel ---
function CrystalDetailPanel({
  activeCrystalId,
  onClose,
}: {
  activeCrystalId: string | null
  onClose: () => void
}) {
  const crystal = activeCrystalId
    ? SKILL_CRYSTALS.find((c) => c.id === activeCrystalId)
    : null

  return (
    <div className={`${styl.detailPanel} ${crystal ? styl.open : ''}`}>
      <button className={styl.panelClose} onClick={onClose} aria-label="Close">
        ✕
      </button>
      {crystal && (
        <>
          <h3 className={styl.panelTitle}>{crystal.title}</h3>
          <p className={styl.panelDesc}>{crystal.description}</p>
          <div className={styl.panelTags}>
            {crystal.tags.map((tag) => (
              <span key={tag} className={styl.panelTag}>{tag}</span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function ThreeScene() {

  const { scrollYProgress } = useScroll();
  const [phase, setPhase] = useState<'loading' | 'fog' | 'ready'>('loading');
  const [activeCrystalId, setActiveCrystalId] = useState<string | null>(null);
  const [timeLightingEnabled, setTimeLightingEnabled] = useState(true);
  const cyanBoostRef = useRef(0.3);
  const isMobile = useMobile();

  // MainVisual のスキルボタンからのイベントを受信
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<{ id: string | null }>).detail.id;
      setActiveCrystalId(id);
    };
    window.addEventListener('crystal:activate', handler);
    return () => window.removeEventListener('crystal:activate', handler);
  }, []);

  // activeCrystalId が変わったら MainVisual のボタンへ通知
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('crystal:statechange', {
      detail: { id: activeCrystalId },
    }));
  }, [activeCrystalId]);

  const handleLoadComplete = useCallback(() => {
    setPhase('fog');
    // 霧が半分晴れた頃にテキスト表示イベントを発火
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('threemodel:reveal'));
    }, 800);
    // 霧が晴れるまで待つ
    setTimeout(() => setPhase('ready'), 2000);
  }, []);

  return (
    <>
    {/* 時刻ライティング トグル（Canvas外・最上位レイヤー） */}
    <button
      className={styl.timeToggle}
      onClick={() => setTimeLightingEnabled(v => !v)}
      data-active={timeLightingEnabled || undefined}
      aria-label="Toggle time-based lighting"
    >
      {timeLightingEnabled ? '🕐 Time ON' : '🕐 Time OFF'}
    </button>
    <div className={styl.canvasModel}>
      <Canvas
        camera={{ position: [3, 4, 16], fov: 45 }}
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onPointerMissed={() => setActiveCrystalId(null)}
      >
        {/* ライティング（時間変化 + シアン脈動 + DB boost） */}
        <SceneLighting scrollYProgress={scrollYProgress} activeCrystalId={activeCrystalId} timeLightingEnabled={timeLightingEnabled} />
        {/* 星空背景（夜に浮かび上がる） */}
        <NightSky scrollYProgress={scrollYProgress} />
        {/* カメラ reveal 演出（ローディング後にパン＆ズーム） */}
        <CameraReveal phase={phase} />
        {/* マウス追従パララックス（reveal 完了後のみ動作） */}
        {phase === 'ready' && <MouseParallax />}
        {/* 霧・モヤ演出（ラピュタ風） */}
        <Cloud
          position={[0, -0.5, 0]}
          opacity={0.05}
          speed={0.2}
          bounds={[4, 1, 1.5]}
          segments={5}
          color="#b0e8ff"
        />
        <Cloud
          position={[1, 0.3, -1]}
          opacity={0.05}
          speed={0.15}
          bounds={[3, 1, 1]}
          segments={3}
          color="#e0f0ff"
        />
        {/* パーティクル（スクロール速度連動・ブルーム除外） */}
        <BloomExcluded>
          <ScrollSparkles scrollYProgress={scrollYProgress} />
        </BloomExcluded>
        <AfterBloomRenderer />
        <Float
          speed={1}
          rotationIntensity={0.5}
          floatIntensity={0.5}
          floatingRange={[-0.1, 0.5]}
        >
          <Model
            scrollYProgress={scrollYProgress}
            activeCrystalId={activeCrystalId}
            onActivateCrystal={setActiveCrystalId}
            cyanBoostRef={cyanBoostRef}
          />
        </Float>
        {/* スケール感演出アセット */}
        <CyanBoostDriver scrollYProgress={scrollYProgress} cyanBoostRef={cyanBoostRef} />
        <Suspense fallback={null}>
          <DroneScout cyanBoostRef={cyanBoostRef} />
        </Suspense>
        {!isMobile && (
          <Suspense fallback={null}>
            <OrbitalRing cyanBoostRef={cyanBoostRef} />
          </Suspense>
        )}
        <Suspense fallback={null}>
          <MechanicalBirds cyanBoostRef={cyanBoostRef} isMobile={isMobile} />
        </Suspense>
        <OrbitControls
          enableZoom={true}
          minDistance={3}
          maxDistance={3}
          enabled={phase === 'ready'}
        />
        {/* ポストプロセス: Bloom（クリスタル等の高輝度オブジェクトのみグロウ） */}
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={2.0}
            luminanceThreshold={1.5}
            luminanceSmoothing={0.2}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
      {/* 2D 詳細パネル（Canvas外） */}
      <CrystalDetailPanel
        activeCrystalId={activeCrystalId}
        onClose={() => setActiveCrystalId(null)}
      />
      {/* パーティクル集合型ローディング演出 */}
      {phase === 'loading' && (
        <LoadingGlitch onTransitionComplete={handleLoadComplete} />
      )}
      {/* 霧オーバーレイ（ローディング後に晴れる） */}
      {phase !== 'ready' && (
        <div className={`${styl.fogOverlay} ${phase === 'fog' ? styl.clear : ''}`} />
      )}
    </div>
    </>
  );
}
