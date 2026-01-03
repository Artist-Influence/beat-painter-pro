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

// Available templates for user selection
export const VISUALIZER_TEMPLATES = {
  smiley: {
    name: 'Reactive Smiley Face',
    geometry: 'multi-mesh',
    animation: 'expression',
    emoji: '😊'
  },
  car: {
    name: 'Audio Reactive Car',
    geometry: 'multi-mesh',
    animation: 'drive',
    emoji: '🚗'
  },
  heart: {
    name: 'Beating Heart',
    geometry: 'multi-mesh',
    animation: 'pulse',
    emoji: '❤️'
  },
  star: {
    name: 'Spinning Star',
    geometry: 'multi-mesh',
    animation: 'spin',
    emoji: '⭐'
  },
  robot: {
    name: 'Robot Army',
    geometry: 'multi-mesh',
    animation: 'march',
    emoji: '🤖'
  },
  flower: {
    name: 'Dancing Flowers',
    geometry: 'multi-mesh',
    animation: 'sway',
    emoji: '🌸'
  },
  sphere: {
    name: 'Pulsing Sphere',
    geometry: 'sphereGeometry',
    animation: 'pulse',
    emoji: '🔮'
  },
  cube: {
    name: 'Spinning Cube',
    geometry: 'boxGeometry',
    animation: 'spin',
    emoji: '📦'
  },
  torus: {
    name: 'Twisting Ring',
    geometry: 'torusGeometry',
    animation: 'twist',
    emoji: '🍩'
  }
};
