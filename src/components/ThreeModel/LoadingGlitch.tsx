import { useRef, useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import styl from './index.module.styl';

type Phase = 'glitching' | 'clean' | 'fading';

const CLEAN_DURATION = 1500; // ms
const FADE_DURATION = 600;
const BRAND_TEXT = 'SP WEBCREAT.';

interface LoadingGlitchProps {
  onTransitionComplete: () => void;
}

export default function LoadingGlitch({ onTransitionComplete }: LoadingGlitchProps) {
  const { progress } = useProgress();
  const [phase, setPhase] = useState<Phase>('glitching');
  const [displayProgress, setDisplayProgress] = useState(0);
  const rafRef = useRef(0);
  const displayRef = useRef(0);
  const progressRef = useRef(0);
  const phaseRef = useRef<Phase>('glitching');

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Smooth counter animation
  useEffect(() => {
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const target = progressRef.current;
      const speed = target >= 100 ? 0.15 : 0.06;
      displayRef.current += (target - displayRef.current) * speed;
      const rounded = Math.min(Math.round(displayRef.current), 100);
      setDisplayProgress(rounded);

      // Phase transition: glitching → clean
      if (phaseRef.current === 'glitching' && rounded >= 100) {
        phaseRef.current = 'clean';
        setPhase('clean');
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Clean → fading
  useEffect(() => {
    if (phase !== 'clean') return;
    const timer = setTimeout(() => {
      phaseRef.current = 'fading';
      setPhase('fading');
    }, CLEAN_DURATION);
    return () => clearTimeout(timer);
  }, [phase]);

  // Fading → complete
  useEffect(() => {
    if (phase !== 'fading') return;
    const timer = setTimeout(() => {
      onTransitionComplete();
    }, FADE_DURATION);
    return () => clearTimeout(timer);
  }, [phase, onTransitionComplete]);

  // Glitch intensity: 1.0 at 0% → 0.0 at 100%
  const intensity = phase === 'glitching'
    ? Math.max(0, 1 - displayProgress / 100)
    : 0;

  return (
    <div
      className={`${styl.loadingGlitch} ${phase === 'fading' ? styl.glitchFading : ''}`}
    >
      {/* Scanlines */}
      <div className={styl.scanlines} style={{ opacity: 0.4 + intensity * 0.6 }} />

      {/* Glitch text */}
      <div className={styl.glitchWrapper}>
        <h1
          className={`${styl.glitchText} ${phase === 'clean' ? styl.glitchClean : ''}`}
          data-text={BRAND_TEXT}
          style={{ '--glitch-intensity': intensity } as React.CSSProperties}
        >
          {BRAND_TEXT}
        </h1>
      </div>

      {/* Progress */}
      <div className={styl.glitchProgress}>
        <div className={styl.glitchTrack}>
          <div
            className={styl.glitchFill}
            style={{ width: `${displayProgress}%` }}
          />
        </div>
        <span className={styl.glitchNum}>{displayProgress}%</span>
      </div>
    </div>
  );
}
