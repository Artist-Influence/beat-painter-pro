import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RandomVisualizerParams, AnimationStyle, ColorScheme } from '@/lib/randomVisualizerGenerator';
import { seededRandom, COLOR_PALETTES } from '@/lib/randomVisualizerGenerator';
import { useVisualizerTexture } from '@/hooks/useVisualizerTexture';
import { useStudioStore } from '@/stores/studioStore';
import { AbstractFormRenderer } from './AbstractFormRenderer';

interface RandomVisualizerTemplateProps {
  params: RandomVisualizerParams;
  audioData: {
    frequency: number[];
    amplitude: number;
    beatStrength: number;
  };
  isPlaying?: boolean;
}

// Audio analysis helper - SUPERCHARGED for maximum reactivity
function analyzeAudioData(frequency: number[]) {
  const freq = frequency || [];
  if (freq.length === 0) {
    return { bass: 0, mids: 0, highs: 0 };
  }
  
  // Extended frequency ranges for full punch detection
  const bassRange = freq.slice(0, 15);     // 0-320Hz: kick, sub-bass
  const midRange = freq.slice(15, 100);    // 320-2150Hz: snare, vocals  
  const highRange = freq.slice(100);       // 2150Hz+: hi-hats, cymbals
  
  // PEAK detection for bass and mids (maximum punch)
  const bass = bassRange.length > 0 ? Math.max(0, ...bassRange) / 255 : 0;
  const lowMids = midRange.slice(0, 20);
  const mids = lowMids.length > 0 ? Math.max(0, ...lowMids) / 255 : 0;
  const highs = highRange.length > 0 ? highRange.reduce((a, b) => a + b, 0) / highRange.length / 255 : 0;
  
  // AGGRESSIVE amplification for DRAMATIC reactivity
  return {
    bass: Math.min(bass * 3.5, 2.5),   // Massive bass punch
    mids: Math.min(mids * 2.8, 2.0),   // Strong mid presence
    highs: Math.min(highs * 2.5, 1.8), // Crisp highs
  };
}

// Background effects components
function StarsBackground({ count = 200 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return pos;
  }, [count]);
  
  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0005;
    }
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.6} />
    </points>
  );
}

function MovingLinesBackground({ audioData }: { audioData: { frequency: number[] } }) {
  const groupRef = useRef<THREE.Group>(null);
  const { bass, mids } = analyzeAudioData(audioData.frequency);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.z += 0.002 + bass * 0.01;
    }
  });
  
  return (
    <group ref={groupRef}>
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh key={i} position={[(i - 10) * 2, 0, -10]} rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.02, 30]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.1 + mids * 0.2} />
        </mesh>
      ))}
    </group>
  );
}

function EnergyFieldBackground({ audioData }: { audioData: { frequency: number[] } }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { bass, mids, highs } = analyzeAudioData(audioData.frequency);
  
  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value = state.clock.elapsedTime;
        material.uniforms.bass.value = bass;
      }
    }
  });
  
  const shader = useMemo(() => ({
    uniforms: {
      time: { value: 0 },
      bass: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float bass;
      varying vec2 vUv;
      void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center);
        float wave = sin(dist * 20.0 - time * 2.0 + bass * 5.0) * 0.5 + 0.5;
        float alpha = (1.0 - dist * 2.0) * wave * 0.3 * (0.5 + bass);
        gl_FragColor = vec4(0.5, 0.2, 1.0, alpha);
      }
    `,
  }), []);
  
  return (
    <mesh ref={meshRef} position={[0, 0, -5]}>
      <planeGeometry args={[20, 20]} />
      <shaderMaterial {...shader} transparent />
    </mesh>
  );
}

function ParticlesBackground({ count = 100, audioData }: { count?: number; audioData: { frequency: number[] } }) {
  const pointsRef = useRef<THREE.Points>(null);
  const { bass, highs } = analyzeAudioData(audioData.frequency);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, [count]);
  
  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.001 + bass * 0.005;
      pointsRef.current.rotation.x += 0.0005 + highs * 0.002;
    }
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.08 + bass * 0.05} color="#8866ff" transparent opacity={0.5 + highs * 0.3} />
    </points>
  );
}

function LightRaysBackground({ audioData }: { audioData: { frequency: number[] } }) {
  const groupRef = useRef<THREE.Group>(null);
  const { bass, mids } = analyzeAudioData(audioData.frequency);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.elapsedTime * 0.1 + bass * 0.5;
    }
  });
  
  return (
    <group ref={groupRef} position={[0, 0, -8]}>
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={i} rotation={[0, 0, (i / 12) * Math.PI * 2]}>
          <planeGeometry args={[0.1 + mids * 0.1, 15]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.1 + bass * 0.15} />
        </mesh>
      ))}
    </group>
  );
}

function AuroraBackground({ audioData }: { audioData: { frequency: number[] } }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { bass, mids, highs } = analyzeAudioData(audioData.frequency);
  
  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value = state.clock.elapsedTime;
        material.uniforms.bass.value = bass;
        material.uniforms.mids.value = mids;
      }
    }
  });
  
  const shader = useMemo(() => ({
    uniforms: {
      time: { value: 0 },
      bass: { value: 0 },
      mids: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float bass;
      uniform float mids;
      varying vec2 vUv;
      void main() {
        float wave1 = sin(vUv.x * 10.0 + time + bass * 3.0) * 0.5 + 0.5;
        float wave2 = sin(vUv.x * 15.0 - time * 1.5 + mids * 2.0) * 0.5 + 0.5;
        float combined = (wave1 + wave2) * 0.5;
        float yFade = smoothstep(0.0, 0.5, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
        vec3 color = mix(vec3(0.0, 0.5, 0.3), vec3(0.2, 0.1, 0.8), combined);
        float alpha = combined * yFade * 0.4 * (0.5 + bass);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  }), []);
  
  return (
    <mesh ref={meshRef} position={[0, 5, -10]}>
      <planeGeometry args={[30, 10]} />
      <shaderMaterial {...shader} transparent />
    </mesh>
  );
}

// Background renderer based on effect type
function BackgroundRenderer({ 
  effect, 
  audioData 
}: { 
  effect: RandomVisualizerParams['backgroundEffect']; 
  audioData: { frequency: number[] };
}) {
  switch (effect) {
    case 'stars':
      return <StarsBackground />;
    case 'movingLines':
      return <MovingLinesBackground audioData={audioData} />;
    case 'energyField':
      return <EnergyFieldBackground audioData={audioData} />;
    case 'particles':
      return <ParticlesBackground audioData={audioData} />;
    case 'lightRays':
      return <LightRaysBackground audioData={audioData} />;
    case 'aurora':
      return <AuroraBackground audioData={audioData} />;
    case 'none':
    default:
      return null;
  }
}

// Main template component
export function RandomVisualizerTemplate({ 
  params, 
  audioData,
  isPlaying = true 
}: RandomVisualizerTemplateProps) {
  // Get audio sensitivity and background effect from store
  const { audioSensitivity, backgroundEffect: storeBackgroundEffect } = useStudioStore();
  
  // Use store's backgroundEffect (from dropdown) if set, otherwise fall back to saved params
  const effectiveBackgroundEffect = storeBackgroundEffect || params.backgroundEffect;
  
  // If we have abstract form params, render the abstract visualizer
  if (params.abstractForm) {
    return (
      <group>
        {/* Background effect from store dropdown */}
        <BackgroundRenderer effect={effectiveBackgroundEffect} audioData={audioData} />
        
        {/* Abstract form visualizer - pass savedStyle for color fallback */}
        <AbstractFormRenderer 
          params={params.abstractForm}
          audioData={audioData}
          savedStyle={params.savedStyle}
        />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <pointLight position={[4, 4, 4]} intensity={1.2} />
        <pointLight position={[-3, -2, 2]} intensity={0.6} />
      </group>
    );
  }
  
  // Fallback - should not reach here with new system
  return (
    <group>
      <BackgroundRenderer effect={effectiveBackgroundEffect} audioData={audioData} />
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#8866ff" emissive="#4422aa" emissiveIntensity={0.5} />
      </mesh>
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 4]} intensity={1.2} />
    </group>
  );
}
