import React from 'react';

// Template-based generation for complex objects (no OpenAI required)
export function generateLocalVisualizer(prompt: string): string {
  const lower = prompt.toLowerCase();
  
  // Smiley face / emoji
  if (/\b(smiley|smile|face|emoji|happy|sad|frown|expression)\b/.test(lower)) {
    return getSmileyFaceTemplate();
  }
  
  // Car / vehicle
  if (/\b(car|vehicle|automobile|driving|drive|racing|race)\b/.test(lower)) {
    return getCarTemplate();
  }
  
  // Heart
  if (/\b(heart|love|valentine|romantic|pulse|beat)\b/.test(lower)) {
    return getHeartTemplate();
  }
  
  // Star
  if (/\b(star|stars|stellar|cosmic|twinkle|sparkle)\b/.test(lower)) {
    return getStarTemplate();
  }
  
  // Robot / android
  if (/\b(robot|android|mech|machine|droid|army|march)\b/.test(lower)) {
    return getRobotTemplate();
  }
  
  // Flower / petals
  if (/\b(flower|petal|blossom|bloom)\b/.test(lower)) {
    return getFlowerTemplate();
  }
  
  // NEW TEMPLATES - Wings
  if (/\b(wings?|angel|feather|flying|fly)\b/.test(lower)) {
    return getWingsTemplate();
  }
  
  // Butterfly
  if (/\b(butterfly|moth|insect)\b/.test(lower)) {
    return getButterflyTemplate();
  }
  
  // Dragon
  if (/\b(dragon|fire|beast|drake)\b/.test(lower)) {
    return getDragonTemplate();
  }
  
  // Spaceship / UFO
  if (/\b(spaceship|ufo|spacecraft|alien\s*ship)\b/.test(lower)) {
    return getSpaceshipTemplate();
  }
  
  // Crown
  if (/\b(crown|king|queen|royal|tiara)\b/.test(lower)) {
    return getCrownTemplate();
  }
  
  // Skull
  if (/\b(skull|skeleton|bones?|death)\b/.test(lower)) {
    return getSkullTemplate();
  }
  
  // Diamond / Gem
  if (/\b(diamond|gem|jewel|gemstone|crystal)\b/.test(lower)) {
    return getDiamondTemplate();
  }
  
  // Moon
  if (/\b(moon|lunar|crescent)\b/.test(lower)) {
    return getMoonTemplate();
  }
  
  // Sun
  if (/\b(sun|solar|rays|sunrise|sunset)\b/.test(lower)) {
    return getSunTemplate();
  }
  
  // Planet / Saturn
  if (/\b(planet|saturn|rings?|orbit)\b/.test(lower)) {
    return getPlanetTemplate();
  }
  
  // Lightning
  if (/\b(lightning|bolt|thunder|electric)\b/.test(lower)) {
    return getLightningTemplate();
  }
  
  // Tornado / Vortex
  if (/\b(tornado|vortex|whirlwind|cyclone|spiral)\b/.test(lower)) {
    return getTornadoTemplate();
  }
  
  // Determine geometry based on keywords for simple shapes
  let geometry = 'icosahedronGeometry';
  let args = '[4, 1]';
  let animationStyle = 'basic';
  
  if (lower.includes('sphere') || lower.includes('ball') || lower.includes('orb')) {
    geometry = 'sphereGeometry';
    args = '[4, 32, 32]';
    animationStyle = 'pulse';
  } else if (lower.includes('cube') || lower.includes('box')) {
    geometry = 'boxGeometry';
    args = '[4, 4, 4]';
    animationStyle = 'spin';
  } else if (lower.includes('ring') || lower.includes('torus') || lower.includes('donut')) {
    geometry = 'torusGeometry';
    args = '[4, 1.2, 16, 100]';
    animationStyle = 'twist';
  } else if (lower.includes('cylinder') || lower.includes('tube')) {
    geometry = 'cylinderGeometry';
    args = '[2, 2, 5, 32]';
    animationStyle = 'wobble';
  } else if (lower.includes('cone') || lower.includes('pyramid')) {
    geometry = 'coneGeometry';
    args = '[2.5, 5, 32]';
    animationStyle = 'sway';
  }
  
  // Get animation code based on style
  const getAnimationCode = (style: string) => {
    switch(style) {
      case 'pulse':
        return `
        meshRef.current.rotation.x = t * 0.3 + bass * 1.5;
        meshRef.current.rotation.y = t * 0.2 + mids * 2;
        meshRef.current.scale.setScalar(1 + bass * 0.8 + Math.sin(t * 2) * 0.1);`;
      case 'spin':
        return `
        meshRef.current.rotation.x = t * 0.5 + bass * 2;
        meshRef.current.rotation.y = t * 0.7 + mids * 3;
        meshRef.current.rotation.z = t * 0.3 + highs * 1.5;
        meshRef.current.scale.setScalar(1 + bass * 0.5);`;
      case 'twist':
        return `
        meshRef.current.rotation.x = t * 0.4 + bass * 1.8;
        meshRef.current.rotation.z = t * 0.8 + mids * 2.5;
        meshRef.current.scale.set(1 + bass * 0.3, 1 + mids * 0.4, 1 + highs * 0.2);`;
      case 'wobble':
        return `
        meshRef.current.rotation.x = Math.sin(t * 0.8) * 0.3 + bass * 1.2;
        meshRef.current.rotation.y = t * 0.6 + mids * 2.2;
        meshRef.current.position.y = Math.sin(t * 1.2) * 0.2 + bass * 0.3;
        meshRef.current.scale.setScalar(1 + bass * 0.6);`;
      case 'sway':
        return `
        meshRef.current.rotation.z = Math.sin(t * 0.5) * 0.4 + bass * 1.5;
        meshRef.current.rotation.y = t * 0.4 + mids * 2;
        meshRef.current.position.x = Math.sin(t * 0.7) * 0.2;
        meshRef.current.scale.setScalar(1 + bass * 0.7);`;
      default:
        return `
        meshRef.current.rotation.x = t * 0.5 + bass * 2;
        meshRef.current.rotation.y = t * 0.3 + mids * 3;
        meshRef.current.scale.setScalar(1 + bass * 0.5);`;
    }
  };
  
  // Return working code with proper template structure
  return `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function CustomVisualizer({ audioData }) {
  const meshRef = useRef(null);
  const groupRef = useRef(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  
  useFrame((state) => {
    if (!audioData.frequency.length) return;
    
    const t = state.clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    const midsRaw = audioData.frequency.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255;
    const highsRaw = audioData.frequency.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255;
    
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.12);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, midsRaw, 0.15);
    smoothedHighs.current = THREE.MathUtils.lerp(smoothedHighs.current, highsRaw, 0.18);
    
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    const mids = smoothedMids.current * audioSensitivity.midsMultiplier;
    const highs = smoothedHighs.current * audioSensitivity.highsMultiplier;
    
    if (meshRef.current) {${getAnimationCode(animationStyle)}
    }
    if (groupRef.current) {
      groupRef.current.rotation.z = t * 0.1 * audioSensitivity.animationSpeed;
    }
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <${geometry} args={${args}} />
        <primitive object={material} />
      </mesh>
    </group>
  );
}`;
}

function getSmileyFaceTemplate(): string {
  return `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function SmileyFaceVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const leftEyeRef = useRef(null);
  const rightEyeRef = useRef(null);
  const mouthRef = useRef(null);
  
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  
  const mouthSegments = useMemo(() => {
    const segments = [];
    for (let i = 0; i < 15; i++) {
      const t = (i / 14) * Math.PI;
      segments.push({ id: i, baseX: Math.cos(t) * 3, baseY: -2.5, baseZ: 4.2 });
    }
    return segments;
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    const midsRaw = audioData.frequency.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255;
    const highsRaw = audioData.frequency.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255;
    
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.12);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, midsRaw, 0.15);
    smoothedHighs.current = THREE.MathUtils.lerp(smoothedHighs.current, highsRaw, 0.18);
    
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    const mids = smoothedMids.current * audioSensitivity.midsMultiplier;
    const highs = smoothedHighs.current * audioSensitivity.highsMultiplier;
    
    // Face pulse
    const faceScale = 1 + bass * 0.15 + audioData.beatStrength * 0.1;
    groupRef.current.scale.setScalar(faceScale);
    groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.1;
    
    // Eyes squint on bass
    if (leftEyeRef.current && rightEyeRef.current) {
      const eyeSquint = 1 - bass * 0.5;
      leftEyeRef.current.scale.y = Math.max(0.3, eyeSquint);
      rightEyeRef.current.scale.y = Math.max(0.3, eyeSquint);
    }
    
    // Mouth - smile vs frown based on bass vs highs
    if (mouthRef.current) {
      const smileFactor = (bass - highs) * 2;
      mouthRef.current.children.forEach((child, i) => {
        const seg = mouthSegments[i];
        if (seg && child) {
          const smileY = smileFactor * Math.sin((i / 14) * Math.PI) * 1;
          child.position.y = seg.baseY + smileY;
          child.scale.setScalar(0.3 + mids * 0.15);
        }
      });
    }
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[6, 32, 32]} />
        <primitive object={material} />
      </mesh>
      
      <group ref={leftEyeRef} position={[-1.8, 1.5, 5]}>
        <mesh>
          <sphereGeometry args={[1, 16, 16]} />
          <primitive object={material} />
        </mesh>
        <mesh position={[0, 0, 0.6]}>
          <sphereGeometry args={[0.45, 12, 12]} />
          <primitive object={material} />
        </mesh>
      </group>
      
      <group ref={rightEyeRef} position={[1.8, 1.5, 5]}>
        <mesh>
          <sphereGeometry args={[1, 16, 16]} />
          <primitive object={material} />
        </mesh>
        <mesh position={[0, 0, 0.6]}>
          <sphereGeometry args={[0.45, 12, 12]} />
          <primitive object={material} />
        </mesh>
      </group>
      
      <mesh position={[-1.8, 3.2, 4.8]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[1.5, 0.3, 0.2]} />
        <primitive object={material} />
      </mesh>
      <mesh position={[1.8, 3.2, 4.8]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[1.5, 0.3, 0.2]} />
        <primitive object={material} />
      </mesh>
      
      <group ref={mouthRef}>
        {mouthSegments.map((seg) => (
          <mesh key={seg.id} position={[seg.baseX, seg.baseY, seg.baseZ]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <primitive object={material} />
          </mesh>
        ))}
      </group>
      
      <mesh position={[0, 0.2, 5.5]}>
        <sphereGeometry args={[0.5, 12, 12]} />
        <primitive object={material} />
      </mesh>
    </group>
  );
}`;
}

function getCarTemplate(): string {
  return `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function CarVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const bodyRef = useRef(null);
  const wheelRefs = useRef([]);
  
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const wheelRotation = useRef(0);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    const midsRaw = audioData.frequency.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255;
    
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.1);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, midsRaw, 0.12);
    
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    const mids = smoothedMids.current * audioSensitivity.midsMultiplier;
    
    // Wheel spin
    wheelRotation.current += audioSensitivity.animationSpeed * 0.15 * (1 + mids * 3);
    wheelRefs.current.forEach((wheel) => {
      if (wheel) wheel.rotation.x = wheelRotation.current;
    });
    
    // Body bounce
    if (bodyRef.current) {
      bodyRef.current.position.y = 2 + bass * 0.8 + Math.sin(t * 8) * bass * 0.15;
      bodyRef.current.rotation.z = Math.sin(t * 3) * bass * 0.06;
    }
    
    // Whole car sway
    groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.12;
    groupRef.current.position.x = Math.sin(t * 0.3) * mids * 2.5;
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      <group ref={bodyRef} position={[0, 2, 0]}>
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[6, 1.8, 3]} />
          <primitive object={material} />
        </mesh>
        <mesh position={[0.4, 1.8, 0]}>
          <boxGeometry args={[3, 1.4, 2.6]} />
          <primitive object={material} />
        </mesh>
        <mesh position={[-2.2, 0.8, 0]} rotation={[0, 0, -0.15]}>
          <boxGeometry args={[1.8, 0.6, 2.8]} />
          <primitive object={material} />
        </mesh>
        <mesh position={[2.4, 0.7, 0]}>
          <boxGeometry args={[1.2, 1, 2.8]} />
          <primitive object={material} />
        </mesh>
        <mesh position={[-3, 0.6, 1]}>
          <sphereGeometry args={[0.3, 12, 12]} />
          <primitive object={material} />
        </mesh>
        <mesh position={[-3, 0.6, -1]}>
          <sphereGeometry args={[0.3, 12, 12]} />
          <primitive object={material} />
        </mesh>
        <mesh position={[3, 0.6, 1.1]}>
          <boxGeometry args={[0.12, 0.4, 0.5]} />
          <primitive object={material} />
        </mesh>
        <mesh position={[3, 0.6, -1.1]}>
          <boxGeometry args={[0.12, 0.4, 0.5]} />
          <primitive object={material} />
        </mesh>
      </group>
      
      {[[-1.8, 0.6, 1.8], [-1.8, 0.6, -1.8], [1.8, 0.6, 1.8], [1.8, 0.6, -1.8]].map((pos, i) => (
        <group key={i} ref={(el) => { if (el) wheelRefs.current[i] = el; }} position={pos}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.6, 0.6, 0.5, 16]} />
            <primitive object={material} />
          </mesh>
          {[0, 1, 2, 3, 4].map((j) => (
            <mesh key={j} rotation={[0, 0, (j / 5) * Math.PI * 2]}>
              <boxGeometry args={[0.12, 1, 0.12]} />
              <primitive object={material} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}`;
}

function getHeartTemplate(): string {
  return `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function HeartVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const lastBeat = useRef(0);
  const beatScale = useRef(1);
  
  const heartPoints = useMemo(() => {
    const points = [];
    for (let t = 0; t < Math.PI * 2; t += 0.12) {
      for (let layer = 0; layer < 4; layer++) {
        const s = 1 - layer * 0.18;
        const x = 16 * Math.pow(Math.sin(t), 3) * s * 0.35;
        const y = (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * s * 0.35;
        const z = (layer - 1.5) * 0.6;
        points.push({ x, y, z, t, fi: Math.floor((t / (Math.PI * 2)) * 255) });
      }
    }
    return points;
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const time = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.15);
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    
    if (audioData.beatStrength > 0.5 && time - lastBeat.current > 0.3) {
      beatScale.current = 1.35;
      lastBeat.current = time;
    }
    beatScale.current = THREE.MathUtils.lerp(beatScale.current, 1, 0.08);
    
    const pulseScale = beatScale.current + bass * 0.3;
    groupRef.current.scale.setScalar(pulseScale);
    groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.2;
    
    groupRef.current.children.forEach((child, i) => {
      const point = heartPoints[i];
      if (!child || !point) return;
      const freq = audioData.frequency[point.fi] || 0;
      const response = (freq / 255) * audioSensitivity.frequency;
      const pulseOffset = Math.sin(time * 4 + point.t * 2) * response * 0.2;
      child.scale.setScalar(0.35 + response * 0.25 + pulseOffset * 0.5);
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      {heartPoints.map((point, i) => (
        <mesh key={i} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[0.35, 8, 8]} />
          <primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}`;
}

function getStarTemplate(): string {
  return `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function StarVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  
  const starParts = useMemo(() => {
    const parts = [];
    const points = 5;
    
    for (let layer = 0; layer < 3; layer++) {
      const s = 1 - layer * 0.25;
      const z = layer * 0.6 - 0.6;
      for (let i = 0; i < points * 2; i++) {
        const angle = (i / (points * 2)) * Math.PI * 2;
        const isOuter = i % 2 === 0;
        const radius = isOuter ? 6 * s : 2.5 * s;
        parts.push({ type: 'point', x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z, angle, isOuter, fi: Math.floor((i / (points * 2)) * 255) });
      }
    }
    
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      for (let j = 0; j < 6; j++) {
        const t = j / 5;
        const radius = 2.5 + t * 3.5;
        parts.push({ type: 'beam', x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: 0, t, fi: Math.floor((i / points) * 255) });
      }
    }
    
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 7 + Math.random() * 4;
      parts.push({ type: 'sparkle', x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: (Math.random() - 0.5) * 3, phase: Math.random() * Math.PI * 2, fi: Math.floor(Math.random() * 255) });
    }
    
    return parts;
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const time = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    const midsRaw = audioData.frequency.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255;
    
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.1);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, midsRaw, 0.12);
    
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    const mids = smoothedMids.current * audioSensitivity.midsMultiplier;
    
    groupRef.current.rotation.z = time * audioSensitivity.animationSpeed * 0.3 + bass * 0.5;
    groupRef.current.scale.setScalar(1 + bass * 0.2 + audioData.beatStrength * 0.15);
    
    groupRef.current.children.forEach((child, i) => {
      const part = starParts[i];
      if (!child || !part) return;
      const freq = audioData.frequency[part.fi] || 0;
      const response = (freq / 255) * audioSensitivity.frequency;
      
      if (part.type === 'point') {
        child.scale.setScalar(0.5 + response * 0.35 + (part.isOuter ? bass * 0.25 : 0));
      } else if (part.type === 'beam') {
        child.scale.setScalar(0.25 + response * 0.2);
        child.position.x = part.x * (1 + mids * 0.2);
        child.position.y = part.y * (1 + mids * 0.2);
      } else if (part.type === 'sparkle') {
        const twinkle = Math.sin(time * 5 + part.phase) * 0.5 + 0.5;
        child.scale.setScalar(0.12 + twinkle * 0.15 + response * 0.1);
      }
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      {starParts.map((part, i) => (
        <mesh key={i} position={[part.x, part.y, part.z]}>
          <sphereGeometry args={[part.type === 'sparkle' ? 0.18 : 0.5, 8, 8]} />
          <primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}`;
}

function getRobotTemplate(): string {
  return `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function RobotVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const marchPhase = useRef(0);
  
  const robots = useMemo(() => {
    const arr = [];
    const rows = 4;
    const cols = 6;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        arr.push({
          id: r * cols + c,
          x: (c - cols / 2) * 3,
          z: (r - rows / 2) * 3,
          phase: (r + c) * 0.35,
          fi: Math.floor(((r * cols + c) / (rows * cols)) * 255)
        });
      }
    }
    return arr;
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.12);
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    
    marchPhase.current += audioSensitivity.animationSpeed * 0.06 * (1 + bass * 2.5);
    
    robots.forEach((robot, i) => {
      const robotGroup = groupRef.current?.children[i];
      if (!robotGroup) return;
      
      const marchY = Math.abs(Math.sin(marchPhase.current + robot.phase)) * (0.4 + bass * 0.6);
      robotGroup.position.y = marchY;
      robotGroup.rotation.z = Math.sin(marchPhase.current + robot.phase) * 0.12;
      
      const head = robotGroup.children[0];
      if (head) {
        head.rotation.y = Math.sin(t * 2 + i * 0.1) * 0.25;
      }
      
      const leftArm = robotGroup.children[2];
      const rightArm = robotGroup.children[3];
      if (leftArm) leftArm.rotation.x = Math.sin(marchPhase.current + robot.phase) * 0.7;
      if (rightArm) rightArm.rotation.x = -Math.sin(marchPhase.current + robot.phase) * 0.7;
      
      const leftLeg = robotGroup.children[4];
      const rightLeg = robotGroup.children[5];
      if (leftLeg) leftLeg.rotation.x = -Math.sin(marchPhase.current + robot.phase) * 0.5;
      if (rightLeg) rightLeg.rotation.x = Math.sin(marchPhase.current + robot.phase) * 0.5;
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      {robots.map((robot) => (
        <group key={robot.id} position={[robot.x, 0, robot.z]}>
          <mesh position={[0, 2.6, 0]}>
            <boxGeometry args={[0.7, 0.7, 0.7]} />
            <primitive object={material} />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <boxGeometry args={[1, 1.2, 0.6]} />
            <primitive object={material} />
          </mesh>
          <mesh position={[-0.7, 1.6, 0]}>
            <boxGeometry args={[0.25, 1, 0.25]} />
            <primitive object={material} />
          </mesh>
          <mesh position={[0.7, 1.6, 0]}>
            <boxGeometry args={[0.25, 1, 0.25]} />
            <primitive object={material} />
          </mesh>
          <mesh position={[-0.3, 0.5, 0]}>
            <boxGeometry args={[0.3, 1, 0.3]} />
            <primitive object={material} />
          </mesh>
          <mesh position={[0.3, 0.5, 0]}>
            <boxGeometry args={[0.3, 1, 0.3]} />
            <primitive object={material} />
          </mesh>
          <mesh position={[-0.18, 2.7, 0.36]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <primitive object={material} />
          </mesh>
          <mesh position={[0.18, 2.7, 0.36]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <primitive object={material} />
          </mesh>
          <mesh position={[0, 3.05, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.35, 8]} />
            <primitive object={material} />
          </mesh>
          <mesh position={[0, 3.25, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <primitive object={material} />
          </mesh>
        </group>
      ))}
    </group>
  );
}`;
}

function getFlowerTemplate(): string {
  return `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function FlowerVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  
  const flowers = useMemo(() => {
    const arr = [];
    const count = 15;
    const petalsPerFlower = 8;
    
    for (let f = 0; f < count; f++) {
      const angle = (f / count) * Math.PI * 2;
      const radius = 5 + Math.sin(f * 0.4) * 2;
      const flower = {
        id: f,
        x: Math.cos(angle) * radius,
        y: Math.sin(f * 0.5) * 1.2,
        z: Math.sin(angle) * radius,
        petals: Array.from({ length: petalsPerFlower }, (_, p) => ({ id: p, angle: (p / petalsPerFlower) * Math.PI * 2, phase: Math.random() * Math.PI * 2 })),
        fi: Math.floor((f / count) * 255)
      };
      arr.push(flower);
    }
    return arr;
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.1);
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    
    let childIndex = 0;
    flowers.forEach((flower) => {
      const freq = audioData.frequency[flower.fi] || 0;
      const response = (freq / 255) * audioSensitivity.frequency + audioData.beatStrength;
      
      const windX = Math.sin(t * 0.6 + flower.id * 0.3) * 0.5;
      const windZ = Math.sin(t * 0.8 + flower.id * 0.2) * 0.4;
      
      flower.petals.forEach((petal) => {
        const child = groupRef.current?.children[childIndex];
        if (child) {
          const petalX = flower.x + Math.cos(petal.angle) * 1.4;
          const petalZ = flower.z + Math.sin(petal.angle) * 1.4;
          const swayX = Math.sin(t * 0.9 + petal.phase) * (0.5 + response);
          const swayZ = Math.sin(t * 1.1 + petal.phase * 1.2) * (0.4 + response);
          
          child.position.set(petalX + windX + swayX, flower.y + response * 1.3, petalZ + windZ + swayZ);
          child.rotation.set(Math.sin(t + petal.phase) * 0.4, petal.angle + t * 0.1, Math.cos(t * 0.8 + petal.phase) * 0.5 + response * 0.25);
          child.scale.setScalar(0.9 + response * 0.4);
        }
        childIndex++;
      });
      
      const centerChild = groupRef.current?.children[childIndex];
      if (centerChild) {
        centerChild.position.set(flower.x + windX * 0.3, flower.y + response * 0.7, flower.z + windZ * 0.3);
        centerChild.scale.setScalar(0.7 + response * 0.5);
      }
      childIndex++;
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      {flowers.map((flower) => (
        <React.Fragment key={flower.id}>
          {flower.petals.map((petal) => (
            <mesh key={petal.id}>
              <sphereGeometry args={[0.5, 8, 8]} />
              <primitive object={material} />
            </mesh>
          ))}
          <mesh>
            <sphereGeometry args={[0.4, 8, 8]} />
            <primitive object={material} />
          </mesh>
        </React.Fragment>
      ))}
      {Array.from({ length: 25 }, (_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 22, Math.random() * 12, (Math.random() - 0.5) * 22]}>
          <sphereGeometry args={[0.12, 6, 6]} />
          <primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}`;
}

function getWingsTemplate(): string {
  return `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function WingsVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const leftWingRef = useRef(null);
  const rightWingRef = useRef(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  
  const feathers = useMemo(() => {
    const left = [];
    const right = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 0.7 + 0.3;
      const length = 0.4 + i * 0.2;
      left.push({ angle, length, delay: i * 0.08 });
      right.push({ angle: -angle, length, delay: i * 0.08 });
    }
    return { left, right };
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    const midsRaw = audioData.frequency.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255;
    
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.15);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, midsRaw, 0.12);
    
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    const mids = smoothedMids.current * audioSensitivity.midsMultiplier;
    
    const flapAngle = Math.sin(t * 3 + bass * 5) * 0.5 * (1 + bass);
    
    if (leftWingRef.current) {
      leftWingRef.current.rotation.z = 0.4 + flapAngle;
      leftWingRef.current.children.forEach((child, i) => {
        child.rotation.z = Math.sin(t * 4 + i * 0.2) * 0.15 * (1 + bass);
      });
    }
    if (rightWingRef.current) {
      rightWingRef.current.rotation.z = -0.4 - flapAngle;
      rightWingRef.current.children.forEach((child, i) => {
        child.rotation.z = -Math.sin(t * 4 + i * 0.2) * 0.15 * (1 + bass);
      });
    }
    
    groupRef.current.scale.setScalar(1 + bass * 0.25);
    groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.15;
    groupRef.current.position.y = Math.sin(t * 2) * 0.3 * (1 + mids);
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      <group ref={leftWingRef} position={[-0.3, 0, 0]}>
        {feathers.left.map((f, i) => (
          <mesh key={i} position={[Math.cos(f.angle) * f.length * 0.5, Math.sin(f.angle) * f.length * 0.3, 0]} rotation={[0, 0, f.angle - Math.PI / 2]}>
            <capsuleGeometry args={[0.08, f.length, 4, 8]} />
            <primitive object={material} />
          </mesh>
        ))}
      </group>
      <group ref={rightWingRef} position={[0.3, 0, 0]}>
        {feathers.right.map((f, i) => (
          <mesh key={i} position={[Math.cos(f.angle) * f.length * 0.5, Math.sin(Math.abs(f.angle)) * f.length * 0.3, 0]} rotation={[0, 0, f.angle + Math.PI / 2]}>
            <capsuleGeometry args={[0.08, f.length, 4, 8]} />
            <primitive object={material} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <primitive object={material} />
      </mesh>
    </group>
  );
}`;
}

function getButterflyTemplate(): string {
  return `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function ButterflyVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const leftWingRef = useRef(null);
  const rightWingRef = useRef(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  
  const wingSpots = useMemo(() => {
    const spots = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 0.6 + 0.3;
      const radius = 0.8 + Math.random() * 0.5;
      spots.push({ angle, radius, size: 0.1 + Math.random() * 0.15 });
    }
    return spots;
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.15);
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    
    const flapSpeed = 6 + bass * 10;
    const flapAngle = Math.sin(t * flapSpeed) * 0.8;
    
    if (leftWingRef.current) leftWingRef.current.rotation.y = flapAngle;
    if (rightWingRef.current) rightWingRef.current.rotation.y = -flapAngle;
    
    groupRef.current.scale.setScalar(1 + bass * 0.3);
    groupRef.current.position.y = Math.sin(t * 1.5) * 0.5;
    groupRef.current.rotation.z = Math.sin(t * 0.8) * 0.1;
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      <group ref={leftWingRef} position={[-0.1, 0, 0]}>
        <mesh rotation={[0, 0, 0.3]}>
          <circleGeometry args={[1.5, 32, 0, Math.PI * 0.7]} />
          <primitive object={material} />
        </mesh>
        {wingSpots.map((spot, i) => (
          <mesh key={i} position={[Math.cos(spot.angle) * spot.radius - 0.5, Math.sin(spot.angle) * spot.radius, 0.01]}>
            <circleGeometry args={[spot.size, 16]} />
            <primitive object={material} />
          </mesh>
        ))}
      </group>
      <group ref={rightWingRef} position={[0.1, 0, 0]} scale={[-1, 1, 1]}>
        <mesh rotation={[0, 0, 0.3]}>
          <circleGeometry args={[1.5, 32, 0, Math.PI * 0.7]} />
          <primitive object={material} />
        </mesh>
        {wingSpots.map((spot, i) => (
          <mesh key={i} position={[Math.cos(spot.angle) * spot.radius - 0.5, Math.sin(spot.angle) * spot.radius, 0.01]}>
            <circleGeometry args={[spot.size, 16]} />
            <primitive object={material} />
          </mesh>
        ))}
      </group>
      <mesh>
        <capsuleGeometry args={[0.08, 0.8, 4, 8]} />
        <primitive object={material} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <primitive object={material} />
      </mesh>
      <mesh position={[-0.08, 0.8, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.01, 0.01, 0.4, 8]} />
        <primitive object={material} />
      </mesh>
      <mesh position={[0.08, 0.8, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.01, 0.01, 0.4, 8]} />
        <primitive object={material} />
      </mesh>
    </group>
  );
}`;
}

function getDragonTemplate(): string {
  return `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function DragonVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const jawRef = useRef(null);
  const fireRef = useRef(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const smoothedHighs = useRef(0);
  
  const spines = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      y: 0.8 - i * 0.15,
      z: -0.2 - i * 0.08,
      size: 0.15 - i * 0.012
    }));
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    const highsRaw = audioData.frequency.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255;
    
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.12);
    smoothedHighs.current = THREE.MathUtils.lerp(smoothedHighs.current, highsRaw, 0.15);
    
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    const highs = smoothedHighs.current * audioSensitivity.highsMultiplier;
    
    if (jawRef.current) {
      jawRef.current.rotation.x = bass * 0.6;
    }
    
    if (fireRef.current) {
      fireRef.current.scale.set(1 + bass * 2, 1 + bass * 3, 1 + bass * 2);
      fireRef.current.visible = bass > 0.15;
    }
    
    groupRef.current.scale.setScalar(1 + bass * 0.2);
    groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.2;
    groupRef.current.rotation.z = Math.sin(t * 0.8) * 0.05 * (1 + highs);
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.3, 0.2]}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <primitive object={material} />
      </mesh>
      <mesh position={[0, 0.1, 0.8]}>
        <boxGeometry args={[0.35, 0.25, 0.5]} />
        <primitive object={material} />
      </mesh>
      <group ref={jawRef} position={[0, -0.05, 0.8]}>
        <mesh position={[0, -0.1, 0.15]}>
          <boxGeometry args={[0.3, 0.12, 0.4]} />
          <primitive object={material} />
        </mesh>
      </group>
      <mesh position={[-0.35, 0.6, 0.1]} rotation={[0, 0, -0.4]}>
        <coneGeometry args={[0.15, 0.5, 8]} />
        <primitive object={material} />
      </mesh>
      <mesh position={[0.35, 0.6, 0.1]} rotation={[0, 0, 0.4]}>
        <coneGeometry args={[0.15, 0.5, 8]} />
        <primitive object={material} />
      </mesh>
      <mesh position={[-0.2, 0.45, 0.5]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <primitive object={material} />
      </mesh>
      <mesh position={[0.2, 0.45, 0.5]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <primitive object={material} />
      </mesh>
      {spines.map((spine, i) => (
        <mesh key={i} position={[0, spine.y, spine.z]}>
          <coneGeometry args={[spine.size * 0.5, spine.size * 2, 6]} />
          <primitive object={material} />
        </mesh>
      ))}
      <group ref={fireRef} position={[0, 0, 1.2]}>
        {[0, 1, 2].map(i => (
          <mesh key={i} position={[0, -i * 0.1, i * 0.3]} scale={[1 - i * 0.2, 1 - i * 0.2, 1]}>
            <coneGeometry args={[0.15 - i * 0.04, 0.4, 8]} />
            <primitive object={material} />
          </mesh>
        ))}
      </group>
    </group>
  );
}`;
}

function getSpaceshipTemplate(): string {
  return `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function SpaceshipVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const lightsRef = useRef([]);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  
  const lights = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      angle: (i / 8) * Math.PI * 2,
      radius: 0.9
    }));
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    const midsRaw = audioData.frequency.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255;
    
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.1);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, midsRaw, 0.12);
    
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    const mids = smoothedMids.current * audioSensitivity.midsMultiplier;
    
    groupRef.current.rotation.y += audioSensitivity.animationSpeed * 0.02 * (1 + mids);
    groupRef.current.position.y = Math.sin(t * 1.5) * 0.3 + bass * 0.5;
    groupRef.current.rotation.x = Math.sin(t * 0.8) * 0.1;
    groupRef.current.rotation.z = Math.sin(t * 0.6) * 0.08;
    groupRef.current.scale.setScalar(1 + bass * 0.15);
    
    lightsRef.current.forEach((light, i) => {
      if (light) {
        const pulse = Math.sin(t * 8 + i * 0.5) * 0.5 + 0.5;
        light.scale.setScalar(0.8 + pulse * 0.4 + bass * 0.5);
      }
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      <mesh>
        <cylinderGeometry args={[1.2, 1.2, 0.3, 32]} />
        <primitive object={material} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={material} />
      </mesh>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 0.15, 32]} />
        <primitive object={material} />
      </mesh>
      {lights.map((light, i) => (
        <mesh
          key={i}
          ref={el => { if (el) lightsRef.current[i] = el; }}
          position={[Math.cos(light.angle) * light.radius, -0.1, Math.sin(light.angle) * light.radius]}
        >
          <sphereGeometry args={[0.08, 12, 12]} />
          <primitive object={material} />
        </mesh>
      ))}
      <mesh position={[0, -0.35, 0]}>
        <coneGeometry args={[0.25, 0.4, 16]} />
        <primitive object={material} />
      </mesh>
    </group>
  );
}`;
}

function getCrownTemplate(): string {
  return `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function CrownVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const gemsRef = useRef([]);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const smoothedHighs = useRef(0);
  
  const points = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      angle: (i / 7) * Math.PI * 2,
      height: i % 2 === 0 ? 1.2 : 0.7
    }));
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    const highsRaw = audioData.frequency.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255;
    
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.12);
    smoothedHighs.current = THREE.MathUtils.lerp(smoothedHighs.current, highsRaw, 0.15);
    
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    const highs = smoothedHighs.current * audioSensitivity.highsMultiplier;
    
    groupRef.current.rotation.y += audioSensitivity.animationSpeed * 0.015;
    groupRef.current.scale.setScalar(1 + bass * 0.2);
    
    gemsRef.current.forEach((gem, i) => {
      if (gem) {
        const pulse = Math.sin(t * 6 + i * 0.8) * 0.3 + 0.7;
        gem.scale.setScalar(pulse + highs * 0.5);
      }
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      <mesh position={[0, -0.2, 0]}>
        <torusGeometry args={[1, 0.15, 16, 32]} />
        <primitive object={material} />
      </mesh>
      {points.map((point, i) => (
        <group key={i}>
          <mesh position={[Math.cos(point.angle) * 0.95, point.height / 2, Math.sin(point.angle) * 0.95]}>
            <coneGeometry args={[0.15, point.height, 6]} />
            <primitive object={material} />
          </mesh>
          {point.height > 1 && (
            <mesh
              ref={el => { if (el) gemsRef.current[i] = el; }}
              position={[Math.cos(point.angle) * 0.95, point.height + 0.1, Math.sin(point.angle) * 0.95]}
            >
              <octahedronGeometry args={[0.12, 0]} />
              <primitive object={material} />
            </mesh>
          )}
        </group>
      ))}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[1.1, 1.05, 0.15, 32]} />
        <primitive object={material} />
      </mesh>
    </group>
  );
}`;
}

function getSkullTemplate(): string {
  return `
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function SkullVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const jawRef = useRef(null);
  const eyesRef = useRef([]);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.15);
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    
    if (jawRef.current) {
      jawRef.current.rotation.x = bass * 0.5;
      jawRef.current.position.y = -0.6 - bass * 0.15;
    }
    
    eyesRef.current.forEach(eye => {
      if (eye) {
        eye.scale.setScalar(0.8 + bass * 0.6);
      }
    });
    
    groupRef.current.scale.setScalar(1 + bass * 0.15);
    groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.15;
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.9, 32, 24]} />
        <primitive object={material} />
      </mesh>
      <mesh position={[0, -0.1, 0.4]}>
        <boxGeometry args={[0.5, 0.4, 0.4]} />
        <primitive object={material} />
      </mesh>
      <mesh position={[-0.25, 0.3, 0.7]} ref={el => { if (el) eyesRef.current[0] = el; }}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <primitive object={material} />
      </mesh>
      <mesh position={[0.25, 0.3, 0.7]} ref={el => { if (el) eyesRef.current[1] = el; }}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <primitive object={material} />
      </mesh>
      <mesh position={[0, 0.05, 0.85]}>
        <coneGeometry args={[0.08, 0.2, 6]} />
        <primitive object={material} />
      </mesh>
      <group ref={jawRef} position={[0, -0.6, 0.3]}>
        <mesh>
          <boxGeometry args={[0.55, 0.25, 0.35]} />
          <primitive object={material} />
        </mesh>
        {[-0.2, -0.1, 0, 0.1, 0.2].map((x, i) => (
          <mesh key={i} position={[x, 0.18, 0.12]}>
            <boxGeometry args={[0.06, 0.1, 0.06]} />
            <primitive object={material} />
          </mesh>
        ))}
      </group>
      {[-0.15, -0.05, 0.05, 0.15].map((x, i) => (
        <mesh key={i} position={[x, -0.35, 0.75]}>
          <boxGeometry args={[0.07, 0.15, 0.07]} />
          <primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}`;
}

function getDiamondTemplate(): string {
  return `
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function DiamondVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const sparkleRefs = useRef([]);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const smoothedHighs = useRef(0);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    const highsRaw = audioData.frequency.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255;
    
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.12);
    smoothedHighs.current = THREE.MathUtils.lerp(smoothedHighs.current, highsRaw, 0.15);
    
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    const highs = smoothedHighs.current * audioSensitivity.highsMultiplier;
    
    groupRef.current.rotation.y += audioSensitivity.animationSpeed * 0.02;
    groupRef.current.scale.setScalar(1 + bass * 0.25);
    
    sparkleRefs.current.forEach((sparkle, i) => {
      if (sparkle) {
        const twinkle = Math.sin(t * 10 + i * 1.5) * 0.5 + 0.5;
        sparkle.scale.setScalar(twinkle * (1 + highs * 2));
        sparkle.position.y = 0.8 + Math.sin(t * 3 + i) * 0.2;
      }
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.5, 0]}>
        <octahedronGeometry args={[1, 0]} />
        <primitive object={material} />
      </mesh>
      <mesh position={[0, -0.8, 0]}>
        <coneGeometry args={[0.8, 1.5, 8]} />
        <primitive object={material} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <mesh
          key={i}
          ref={el => { if (el) sparkleRefs.current[i] = el; }}
          position={[Math.cos(i * Math.PI / 3) * 1.5, 0.8, Math.sin(i * Math.PI / 3) * 1.5]}
        >
          <octahedronGeometry args={[0.08, 0]} />
          <primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}`;
}

function getMoonTemplate(): string {
  return `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function MoonVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const starsRef = useRef([]);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const smoothedHighs = useRef(0);
  
  const stars = useMemo(() => {
    return Array.from({ length: 30 }, () => ({
      x: (Math.random() - 0.5) * 6,
      y: (Math.random() - 0.5) * 6,
      z: (Math.random() - 0.5) * 2 - 1,
      phase: Math.random() * Math.PI * 2
    }));
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    const highsRaw = audioData.frequency.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255;
    
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.1);
    smoothedHighs.current = THREE.MathUtils.lerp(smoothedHighs.current, highsRaw, 0.12);
    
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    const highs = smoothedHighs.current * audioSensitivity.highsMultiplier;
    
    groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.1;
    groupRef.current.scale.setScalar(1 + bass * 0.15);
    
    starsRef.current.forEach((star, i) => {
      if (star && stars[i]) {
        const twinkle = Math.sin(t * 5 + stars[i].phase) * 0.5 + 0.5;
        star.scale.setScalar(twinkle * (0.5 + highs));
      }
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <primitive object={material} />
      </mesh>
      <mesh position={[0.5, 0.3, 1.3]}>
        <sphereGeometry args={[0.6, 32, 32]} />
        <primitive object={material} />
      </mesh>
      {stars.map((star, i) => (
        <mesh
          key={i}
          ref={el => { if (el) starsRef.current[i] = el; }}
          position={[star.x, star.y, star.z]}
        >
          <sphereGeometry args={[0.04, 8, 8]} />
          <primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}`;
}

function getSunTemplate(): string {
  return `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function SunVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const raysRef = useRef([]);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  
  const rays = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => ({
      angle: (i / 16) * Math.PI * 2,
      length: i % 2 === 0 ? 1.8 : 1.2
    }));
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    const midsRaw = audioData.frequency.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255;
    
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.12);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, midsRaw, 0.15);
    
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    const mids = smoothedMids.current * audioSensitivity.midsMultiplier;
    
    groupRef.current.rotation.z += audioSensitivity.animationSpeed * 0.005;
    groupRef.current.scale.setScalar(1 + bass * 0.2);
    
    raysRef.current.forEach((ray, i) => {
      if (ray && rays[i]) {
        const pulse = Math.sin(t * 4 + i * 0.4) * 0.3 + 0.7;
        ray.scale.y = pulse * (1 + mids * 0.5);
      }
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <primitive object={material} />
      </mesh>
      {rays.map((ray, i) => (
        <mesh
          key={i}
          ref={el => { if (el) raysRef.current[i] = el; }}
          position={[Math.cos(ray.angle) * 1.4, Math.sin(ray.angle) * 1.4, 0]}
          rotation={[0, 0, ray.angle - Math.PI / 2]}
        >
          <coneGeometry args={[0.12, ray.length, 6]} />
          <primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}`;
}

function getPlanetTemplate(): string {
  return `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function PlanetVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const ringRef = useRef(null);
  const moonsRef = useRef([]);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  
  const moons = useMemo(() => {
    return Array.from({ length: 3 }, (_, i) => ({
      distance: 2.2 + i * 0.5,
      speed: 0.8 - i * 0.2,
      size: 0.15 - i * 0.03,
      phase: (i / 3) * Math.PI * 2
    }));
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    const midsRaw = audioData.frequency.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255;
    
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.1);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, midsRaw, 0.12);
    
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    const mids = smoothedMids.current * audioSensitivity.midsMultiplier;
    
    groupRef.current.rotation.y += audioSensitivity.animationSpeed * 0.01;
    groupRef.current.scale.setScalar(1 + bass * 0.15);
    
    if (ringRef.current) {
      ringRef.current.rotation.z = Math.sin(t * 0.5) * 0.1;
    }
    
    moonsRef.current.forEach((moon, i) => {
      if (moon && moons[i]) {
        const orbitAngle = t * moons[i].speed * audioSensitivity.animationSpeed + moons[i].phase;
        moon.position.x = Math.cos(orbitAngle) * moons[i].distance;
        moon.position.z = Math.sin(orbitAngle) * moons[i].distance * 0.3;
        moon.scale.setScalar(1 + mids * 0.3);
      }
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <primitive object={material} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2.5, 0, 0]}>
        <torusGeometry args={[1.8, 0.15, 2, 64]} />
        <primitive object={material} />
      </mesh>
      {moons.map((moon, i) => (
        <mesh
          key={i}
          ref={el => { if (el) moonsRef.current[i] = el; }}
        >
          <sphereGeometry args={[moon.size, 16, 16]} />
          <primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}`;
}

function getLightningTemplate(): string {
  return `
import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function LightningVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const boltsRef = useRef([]);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const lastStrike = useRef(0);
  
  const [boltPositions, setBoltPositions] = useState(() => generateBolts());
  
  function generateBolts() {
    return Array.from({ length: 5 }, () => {
      const segments = [];
      let y = 2;
      let x = (Math.random() - 0.5) * 1.5;
      for (let i = 0; i < 8; i++) {
        segments.push({ x, y });
        x += (Math.random() - 0.5) * 0.8;
        y -= 0.5;
      }
      return { segments, active: Math.random() > 0.5 };
    });
  }
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.2);
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    
    if (bass > 0.3 && t - lastStrike.current > 0.15) {
      setBoltPositions(generateBolts());
      lastStrike.current = t;
    }
    
    groupRef.current.scale.setScalar(1 + bass * 0.3);
    
    boltsRef.current.forEach((bolt, i) => {
      if (bolt && boltPositions[i]) {
        bolt.visible = boltPositions[i].active || bass > 0.2;
        bolt.scale.x = 0.5 + bass * 2;
      }
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      {boltPositions.map((bolt, boltIndex) => (
        <group key={boltIndex} ref={el => { if (el) boltsRef.current[boltIndex] = el; }}>
          {bolt.segments.map((seg, i) => {
            const next = bolt.segments[i + 1];
            if (!next) return null;
            const length = Math.sqrt((next.x - seg.x) ** 2 + (next.y - seg.y) ** 2);
            const angle = Math.atan2(next.y - seg.y, next.x - seg.x);
            return (
              <mesh
                key={i}
                position={[(seg.x + next.x) / 2, (seg.y + next.y) / 2, 0]}
                rotation={[0, 0, angle]}
              >
                <boxGeometry args={[length, 0.08, 0.08]} />
                <primitive object={material} />
              </mesh>
            );
          })}
        </group>
      ))}
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <primitive object={material} />
      </mesh>
    </group>
  );
}`;
}

function getTornadoTemplate(): string {
  return `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function TornadoVisualizer({ audioData }) {
  const groupRef = useRef(null);
  const ringsRef = useRef([]);
  const debrisRef = useRef([]);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  
  const rings = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      y: -2 + i * 0.4,
      radius: 0.2 + i * 0.15,
      speed: 2 - i * 0.1
    }));
  }, []);
  
  const debris = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      angle: (i / 20) * Math.PI * 2,
      height: Math.random() * 4 - 2,
      distance: 0.5 + Math.random() * 1.5,
      speed: 1 + Math.random() * 2
    }));
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    const midsRaw = audioData.frequency.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255;
    
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.12);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, midsRaw, 0.15);
    
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    const mids = smoothedMids.current * audioSensitivity.midsMultiplier;
    
    groupRef.current.scale.setScalar(1 + bass * 0.2);
    
    ringsRef.current.forEach((ring, i) => {
      if (ring && rings[i]) {
        ring.rotation.y = t * rings[i].speed * audioSensitivity.animationSpeed * (1 + mids);
        ring.scale.setScalar(1 + bass * 0.3);
      }
    });
    
    debrisRef.current.forEach((item, i) => {
      if (item && debris[i]) {
        const angle = t * debris[i].speed * audioSensitivity.animationSpeed + debris[i].angle;
        const dist = debris[i].distance * (1 + bass * 0.5);
        item.position.x = Math.cos(angle) * dist;
        item.position.z = Math.sin(angle) * dist;
        item.position.y = debris[i].height + Math.sin(t * 2 + i) * 0.3;
        item.rotation.x = t * 3;
        item.rotation.y = t * 2;
      }
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <mesh
          key={i}
          ref={el => { if (el) ringsRef.current[i] = el; }}
          position={[0, ring.y, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[ring.radius, 0.03, 8, 24]} />
          <primitive object={material} />
        </mesh>
      ))}
      {debris.map((item, i) => (
        <mesh
          key={i}
          ref={el => { if (el) debrisRef.current[i] = el; }}
        >
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}`;
}

// Available templates for user selection
export const VISUALIZER_TEMPLATES = {
  smiley: { name: 'Reactive Smiley Face', geometry: 'multi-mesh', animation: 'expression', emoji: '😊' },
  car: { name: 'Audio Reactive Car', geometry: 'multi-mesh', animation: 'drive', emoji: '🚗' },
  heart: { name: 'Beating Heart', geometry: 'multi-mesh', animation: 'pulse', emoji: '❤️' },
  star: { name: 'Spinning Star', geometry: 'multi-mesh', animation: 'spin', emoji: '⭐' },
  robot: { name: 'Robot Army', geometry: 'multi-mesh', animation: 'march', emoji: '🤖' },
  flower: { name: 'Dancing Flowers', geometry: 'multi-mesh', animation: 'sway', emoji: '🌸' },
  wings: { name: 'Angel Wings', geometry: 'multi-mesh', animation: 'flap', emoji: '🪽' },
  butterfly: { name: 'Butterfly', geometry: 'multi-mesh', animation: 'flutter', emoji: '🦋' },
  dragon: { name: 'Fire Dragon', geometry: 'multi-mesh', animation: 'breathe', emoji: '🐉' },
  spaceship: { name: 'UFO Spaceship', geometry: 'multi-mesh', animation: 'hover', emoji: '🛸' },
  crown: { name: 'Royal Crown', geometry: 'multi-mesh', animation: 'glow', emoji: '👑' },
  skull: { name: 'Skull', geometry: 'multi-mesh', animation: 'jaw', emoji: '💀' },
  diamond: { name: 'Diamond Gem', geometry: 'multi-mesh', animation: 'sparkle', emoji: '💎' },
  moon: { name: 'Crescent Moon', geometry: 'multi-mesh', animation: 'float', emoji: '🌙' },
  sun: { name: 'Radiant Sun', geometry: 'multi-mesh', animation: 'rays', emoji: '☀️' },
  planet: { name: 'Saturn Planet', geometry: 'multi-mesh', animation: 'orbit', emoji: '🪐' },
  lightning: { name: 'Lightning Bolt', geometry: 'multi-mesh', animation: 'strike', emoji: '⚡' },
  tornado: { name: 'Tornado Vortex', geometry: 'multi-mesh', animation: 'spin', emoji: '🌪️' },
  sphere: { name: 'Pulsing Sphere', geometry: 'sphereGeometry', animation: 'pulse', emoji: '🔮' },
  cube: { name: 'Spinning Cube', geometry: 'boxGeometry', animation: 'spin', emoji: '📦' },
  torus: { name: 'Twisting Ring', geometry: 'torusGeometry', animation: 'twist', emoji: '🍩' }
};
