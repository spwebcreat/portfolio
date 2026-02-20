import React, { useRef, createRef, useState, useCallback } from "react";
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
  useProgress,
} from "@react-three/drei";
import { motion as motion3d } from "framer-motion-3d";
import styl from './index.module.styl';

// Draco デコーダーの設定（floating-castle.glb はDraco圧縮済み）
useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const MODEL_URL = '/3dModels/sky-castle/floating-castle.glb';

// 各破片の初期位置（GLBから取得した値）
const FRAGMENT_BASE: { key: string; pos: [number, number, number] }[] = [
  { key: 'Rock_Fragment_01', pos: [1.00,  0.10,  0.57] },
  { key: 'Rock_Fragment_02', pos: [-1.00, 0.30,  0.84] },
  { key: 'Rock_Fragment_03', pos: [-0.92, -0.10, -0.77] },
  { key: 'Rock_Fragment_04', pos: [0.93,  0.50, -1.11] },
  { key: 'Rock_Fragment_05', pos: [0.00, -0.25,  1.60] },
];

// スクロール時間変化の設定（朝→昼→夕→夜→深夜）
const TIME_CONFIG = [
  { at: 0.00, ambient: new THREE.Color('#fff5e0'), intensity: 0.8, dirIntensity: 2.0, cyanIntensity: 3 },
  { at: 0.25, ambient: new THREE.Color('#ffffff'), intensity: 1.0, dirIntensity: 2.5, cyanIntensity: 3 },
  { at: 0.50, ambient: new THREE.Color('#ff8c42'), intensity: 0.7, dirIntensity: 1.5, cyanIntensity: 5 },
  { at: 0.75, ambient: new THREE.Color('#1a1a3e'), intensity: 0.3, dirIntensity: 0.5, cyanIntensity: 8 },
  { at: 1.00, ambient: new THREE.Color('#0a0a1a'), intensity: 0.15, dirIntensity: 0.2, cyanIntensity: 12 },
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

// スクロール時間変化 + シアン脈動を制御するコンポーネント
const SceneLighting = ({ scrollYProgress }: { scrollYProgress: any }) => {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const cyanRef = useRef<THREE.PointLight>(null);

  const scrollRef = useRef(0);
  React.useEffect(() => {
    return scrollYProgress.on('change', (v: number) => { scrollRef.current = v; });
  }, [scrollYProgress]);

  useFrame(({ clock }) => {
    const scroll = scrollRef.current;
    const time = lerpTimeConfig(scroll);

    // 環境光の時間変化
    if (ambientRef.current) {
      ambientRef.current.color.copy(time.ambient);
      ambientRef.current.intensity = time.intensity;
    }

    // 方向光の時間変化
    if (dirRef.current) {
      dirRef.current.intensity = time.dirIntensity;
    }

    // シアン発光: 時間変化 + 脈動（sin でゆっくり明滅）
    if (cyanRef.current) {
      const pulse = Math.sin(clock.elapsedTime * 1.2) * 0.3 + 1; // 0.7〜1.3
      cyanRef.current.intensity = time.cyanIntensity * pulse;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.5} color="#e8f4ff" />
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

const Model = ({ scrollYProgress }: { scrollYProgress: any }) => {
  const group = useRef<THREE.Group>(null);
  const { nodes, materials } = useGLTF(MODEL_URL) as any;
  const rotationY = useTransform(scrollYProgress, [0, 1], [0, Math.PI * 0.8]);

  // 破片の ref
  const fragmentRefs = useRef(FRAGMENT_BASE.map(() => createRef<THREE.Mesh>()));

  // emissiveリセット（初回のみ）
  React.useEffect(() => {
    Object.values(materials).forEach((mat) => {
      const m = mat as THREE.MeshStandardMaterial;
      m.emissive.set('#000000');
      m.emissiveIntensity = 0;
      m.needsUpdate = true;
    });
  }, [materials]);

  // スクロール値を毎フレーム取得するための ref
  const scrollRef = useRef(0);
  React.useEffect(() => {
    return scrollYProgress.on('change', (v: number) => { scrollRef.current = v; });
  }, [scrollYProgress]);

  // 浮遊破片アニメーション（ふわふわ + スクロールで外側に散らばる）
  useFrame(({ clock }) => {
    const scroll = scrollRef.current; // 0（トップ）〜 1（最下部）
    fragmentRefs.current.forEach((ref, i) => {
      if (!ref.current) return;
      const [baseX, baseY, baseZ] = FRAGMENT_BASE[i].pos;
      // スクロールに応じて外側に広がる（spread: 0〜1.5倍の距離）
      const spread = 1 + scroll * 1.5;
      ref.current.position.x = baseX * spread;
      ref.current.position.z = baseZ * spread;
      // ふわふわ上下 + スクロールで少し沈む
      ref.current.position.y = baseY + Math.sin(clock.elapsedTime * 0.8 + i * 1.2) * 0.03 - scroll * 0.5;
      // ゆっくり自転（スクロールで加速）
      ref.current.rotation.y += (0.03 + scroll * 0.05) * (i % 2 === 0 ? 1 : -1);
    });
  });

  return (
    <motion3d.group ref={group as any} rotation-y={rotationY}>
      <group position={[0, -1, 0]}>
        {/* 岩盤（GLBの元トランスフォームを保持） */}
        <primitive object={nodes.Rock_Base} />
        {/* 城（GLBの元トランスフォームを保持） */}
        <primitive object={nodes.Castle} />
        {/* 浮遊破片（個別アニメーション付き） */}
        {FRAGMENT_BASE.map(({ key, pos }, i) => (
          <mesh
            key={key}
            ref={fragmentRefs.current[i]}
            geometry={nodes[key].geometry}
            material={materials.Mat_Rock}
            position={pos}
            scale={0.01 * i + 0.05} // 破片ごとに少しずつサイズを変える
          />
        ))}
      </group>
    </motion3d.group>
  );
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

useGLTF.preload(MODEL_URL);

// ローディング画面
const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const { progress, loaded, total } = useProgress();
  const [fadeOut, setFadeOut] = useState(false);

  React.useEffect(() => {
    if (progress >= 100) {
      // ロード完了 → 少し待ってからフェードアウト開始
      const timer = setTimeout(() => {
        setFadeOut(true);
        // フェードアウト完了後にコールバック
        const removeTimer = setTimeout(onComplete, 1500);
        return () => clearTimeout(removeTimer);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  return (
    <div className={`${styl.loadingOverlay} ${fadeOut ? styl.fadeOut : ''}`}>
      {/* シアンの光の粒（CSS） */}
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="8" fill="none" stroke="#00e5ff" strokeWidth="1" opacity="0.6">
          <animate attributeName="r" from="8" to="18" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="20" cy="20" r="3" fill="#00e5ff" opacity="0.8" />
      </svg>
      <div className={styl.loadingProgress}>
        <div className={styl.loadingBar} style={{ width: `${progress}%` }} />
      </div>
      <div className={styl.loadingText}>Loading</div>
    </div>
  );
};

export default function ThreeScene() {

  const { scrollYProgress } = useScroll();
  const [phase, setPhase] = useState<'loading' | 'fog' | 'ready'>('loading');

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
    <div className={styl.canvasModel}>
      <Canvas
        camera={{ position: [0, 0.5, 10], fov: 45 }}
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        {/* ライティング（時間変化 + シアン脈動） */}
        <SceneLighting scrollYProgress={scrollYProgress} />
        {/* 星空背景（夜に浮かび上がる） */}
        <NightSky scrollYProgress={scrollYProgress} />
        {/* マウス追従パララックス */}
        <MouseParallax />
        {/* 霧・モヤ演出（ラピュタ風） */}
        <Cloud
          position={[0, -0.5, 0]}
          opacity={0.15}
          speed={0.2}
          bounds={[4, 1, 1.5]}
          segments={12}
          color="#b0e8ff"
        />
        <Cloud
          position={[1, 0.3, -1]}
          opacity={0.1}
          speed={0.15}
          bounds={[3, 1, 1]}
          segments={8}
          color="#e0f0ff"
        />
        {/* パーティクル（スクロール速度連動） */}
        <ScrollSparkles scrollYProgress={scrollYProgress} />
        <Float
          speed={1}
          rotationIntensity={0.5}
          floatIntensity={0.5}
          floatingRange={[-0.1, 0.5]}
        >
          <Model scrollYProgress={scrollYProgress} />
        </Float>
        <OrbitControls
          enableZoom={true}
          minDistance={3}
          maxDistance={3}
          onChange={(e) => {
            if (e?.target) {
              // console.log('camera:', e.target.object.position.x.toFixed(2), e.target.object.position.y.toFixed(2), e.target.object.position.z.toFixed(2));
            }
          }}
        />
      </Canvas>
      {/* ローディング画面（Canvas外でHTML描画） */}
      <LoadingScreen onComplete={handleLoadComplete} />
      {/* 霧オーバーレイ（ローディング後に晴れる） */}
      {phase !== 'ready' && (
        <div className={`${styl.fogOverlay} ${phase === 'fog' ? styl.clear : ''}`} />
      )}
    </div>
  );
}