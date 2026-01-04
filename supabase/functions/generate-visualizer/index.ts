
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced geometry detection with word boundaries
const detectGeometry = (prompt: string): string => {
  const normalizedPrompt = prompt.toLowerCase();
  
  // Word boundary patterns to prevent false matches
  const geometryPatterns = [
    { pattern: /\b(cube|box|square)\b/, geometry: 'box' },
    { pattern: /\b(sphere|ball|orb|circle)\b/, geometry: 'sphere' },
    { pattern: /\b(cylinder|tube|pipe)\b/, geometry: 'cylinder' },
    { pattern: /\b(cone|pyramid)\b/, geometry: 'cone' },
    { pattern: /\b(plane|flat|surface)\b/, geometry: 'plane' },
    { pattern: /\b(torus|donut|ring)\b/, geometry: 'torus' },
  ];
  
  for (const { pattern, geometry } of geometryPatterns) {
    if (pattern.test(normalizedPrompt)) {
      return geometry;
    }
  }
  
  return 'sphere'; // default
};

// Enhanced semantic template system with detailed multi-component objects
const getSemanticTemplate = (prompt: string): { code: string; name: string; emoji: string } | null => {
  const normalizedPrompt = prompt.toLowerCase();
  
  // Smiley face / emoji template - audio reactive expressions
  if (/\b(smiley|smile|face|emoji|happy|sad|frown|expression)\b/.test(normalizedPrompt)) {
    return {
      name: "Reactive Smiley Face",
      emoji: "😊",
      code: `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function SmileyFaceVisualizer({ audioData }: { audioData: { frequency: number[]; amplitude: number; beatStrength: number; } }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Group>(null);
  const leftBrowRef = useRef<THREE.Mesh>(null);
  const rightBrowRef = useRef<THREE.Mesh>(null);
  
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  // Smoothed audio values for natural motion
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  
  // Mouth segments for smile/frown animation
  const mouthSegments = useMemo(() => {
    const segments = [];
    for (let i = 0; i < 20; i++) {
      const t = (i / 19) * Math.PI; // 0 to PI for half circle
      segments.push({
        id: i,
        baseX: Math.cos(t) * 2.5,
        baseY: -2.2,
        baseZ: 1.8
      });
    }
    return segments;
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    // Calculate frequency bands
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    const midsRaw = audioData.frequency.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255;
    const highsRaw = audioData.frequency.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255;
    
    // Smooth the values
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.12);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, midsRaw, 0.15);
    smoothedHighs.current = THREE.MathUtils.lerp(smoothedHighs.current, highsRaw, 0.18);
    
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    const mids = smoothedMids.current * audioSensitivity.midsMultiplier;
    const highs = smoothedHighs.current * audioSensitivity.highsMultiplier;
    
    // Main face pulse
    const faceScale = 1 + bass * 0.15 + audioData.beatStrength * 0.1;
    groupRef.current.scale.setScalar(faceScale);
    groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.1;
    groupRef.current.rotation.z = Math.sin(t * 0.5) * 0.05;
    
    // Eyes squint on bass hits
    if (leftEyeRef.current && rightEyeRef.current) {
      const eyeSquint = 1 - bass * 0.5; // Squint more with bass
      leftEyeRef.current.scale.y = Math.max(0.3, eyeSquint);
      rightEyeRef.current.scale.y = Math.max(0.3, eyeSquint);
      
      // Pupils follow mids
      leftEyeRef.current.position.x = -1.5 + Math.sin(t * 2) * 0.1 * mids;
      rightEyeRef.current.position.x = 1.5 + Math.sin(t * 2) * 0.1 * mids;
    }
    
    // Eyebrows react to highs
    if (leftBrowRef.current && rightBrowRef.current) {
      const browLift = highs * 0.5;
      leftBrowRef.current.position.y = 2.8 + browLift;
      rightBrowRef.current.position.y = 2.8 + browLift;
      leftBrowRef.current.rotation.z = -0.2 - bass * 0.3;
      rightBrowRef.current.rotation.z = 0.2 + bass * 0.3;
    }
    
    // Mouth animation - smile vs frown based on bass vs highs
    if (mouthRef.current) {
      const smileFactor = (bass - highs) * 2; // Positive = smile, negative = frown
      mouthRef.current.children.forEach((child, i) => {
        const segment = mouthSegments[i];
        if (segment && child) {
          const smileY = smileFactor * Math.sin((i / 19) * Math.PI) * 0.8;
          child.position.y = segment.baseY + smileY;
          child.scale.setScalar(0.25 + mids * 0.1);
        }
      });
    }
  });
  
  const material = createVisualizerMaterial('#ffffff');
  
  return (
    <group ref={groupRef}>
      {/* Main face circle */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[5, 32, 32]} />
        <primitive object={material} />
      </mesh>
      
      {/* Left Eye */}
      <group ref={leftEyeRef} position={[-1.5, 1.2, 4]}>
        <mesh>
          <sphereGeometry args={[0.8, 16, 16]} />
          <primitive object={material} />
        </mesh>
        {/* Pupil */}
        <mesh position={[0, 0, 0.5]}>
          <sphereGeometry args={[0.35, 12, 12]} />
          <primitive object={material} />
        </mesh>
      </group>
      
      {/* Right Eye */}
      <group ref={rightEyeRef} position={[1.5, 1.2, 4]}>
        <mesh>
          <sphereGeometry args={[0.8, 16, 16]} />
          <primitive object={material} />
        </mesh>
        {/* Pupil */}
        <mesh position={[0, 0, 0.5]}>
          <sphereGeometry args={[0.35, 12, 12]} />
          <primitive object={material} />
        </mesh>
      </group>
      
      {/* Left Eyebrow */}
      <mesh ref={leftBrowRef} position={[-1.5, 2.8, 4]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[1.2, 0.25, 0.2]} />
        <primitive object={material} />
      </mesh>
      
      {/* Right Eyebrow */}
      <mesh ref={rightBrowRef} position={[1.5, 2.8, 4]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[1.2, 0.25, 0.2]} />
        <primitive object={material} />
      </mesh>
      
      {/* Mouth - series of spheres */}
      <group ref={mouthRef}>
        {mouthSegments.map((seg) => (
          <mesh key={seg.id} position={[seg.baseX, seg.baseY, seg.baseZ]}>
            <sphereGeometry args={[0.25, 8, 8]} />
            <primitive object={material} />
          </mesh>
        ))}
      </group>
      
      {/* Cheeks */}
      <mesh position={[-3, -0.5, 3.5]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <primitive object={material} />
      </mesh>
      <mesh position={[3, -0.5, 3.5]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <primitive object={material} />
      </mesh>
      
      {/* Nose */}
      <mesh position={[0, 0, 4.5]}>
        <sphereGeometry args={[0.4, 12, 12]} />
        <primitive object={material} />
      </mesh>
    </group>
  );
}`
    };
  }
  
  // Car / vehicle template
  if (/\b(car|vehicle|automobile|driving|drive|racing|race)\b/.test(normalizedPrompt)) {
    return {
      name: "Audio Reactive Car",
      emoji: "🚗",
      code: `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function CarVisualizer({ audioData }: { audioData: { frequency: number[]; amplitude: number; beatStrength: number; } }) {
  const groupRef = useRef<THREE.Group>(null);
  const wheelsRef = useRef<THREE.Group[]>([]);
  const bodyRef = useRef<THREE.Group>(null);
  const headlightsRef = useRef<THREE.Mesh[]>([]);
  
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  const wheelRotation = useRef(0);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const t = clock.getElapsedTime();
    
    // Calculate frequency bands
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    const midsRaw = audioData.frequency.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255;
    const highsRaw = audioData.frequency.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255;
    
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.1);
    smoothedMids.current = THREE.MathUtils.lerp(smoothedMids.current, midsRaw, 0.12);
    smoothedHighs.current = THREE.MathUtils.lerp(smoothedHighs.current, highsRaw, 0.15);
    
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    const mids = smoothedMids.current * audioSensitivity.midsMultiplier;
    const highs = smoothedHighs.current * audioSensitivity.highsMultiplier;
    
    // Wheel rotation based on audio speed
    const speed = audioSensitivity.animationSpeed * (1 + mids * 2);
    wheelRotation.current += speed * 0.1;
    
    // Spin all wheels
    wheelsRef.current.forEach((wheel) => {
      if (wheel) {
        wheel.rotation.x = wheelRotation.current;
      }
    });
    
    // Body bouncing (suspension) on bass
    if (bodyRef.current) {
      bodyRef.current.position.y = 1.5 + bass * 0.5 + Math.sin(t * 8) * bass * 0.1;
      bodyRef.current.rotation.z = Math.sin(t * 3) * bass * 0.05;
      bodyRef.current.rotation.x = -bass * 0.03;
    }
    
    // Headlights pulse with highs
    headlightsRef.current.forEach((light) => {
      if (light) {
        light.scale.setScalar(1 + highs * 0.5 + audioData.beatStrength * 0.3);
      }
    });
    
    // Whole car sways
    groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.1;
    groupRef.current.position.x = Math.sin(t * 0.3) * mids * 2;
  });
  
  const material = createVisualizerMaterial('#ffffff');
  
  return (
    <group ref={groupRef}>
      {/* Car body group */}
      <group ref={bodyRef} position={[0, 1.5, 0]}>
        {/* Main body */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[5, 1.5, 2.5]} />
          <primitive object={material} />
        </mesh>
        
        {/* Cabin */}
        <mesh position={[0.3, 1.5, 0]}>
          <boxGeometry args={[2.5, 1.2, 2.2]} />
          <primitive object={material} />
        </mesh>
        
        {/* Hood */}
        <mesh position={[-1.8, 0.7, 0]} rotation={[0, 0, -0.15]}>
          <boxGeometry args={[1.5, 0.5, 2.3]} />
          <primitive object={material} />
        </mesh>
        
        {/* Trunk */}
        <mesh position={[2, 0.6, 0]}>
          <boxGeometry args={[1, 0.8, 2.3]} />
          <primitive object={material} />
        </mesh>
        
        {/* Windshield frame */}
        <mesh position={[-0.8, 1.8, 0]} rotation={[0, 0, 0.4]}>
          <boxGeometry args={[0.1, 1, 2]} />
          <primitive object={material} />
        </mesh>
        
        {/* Rear window frame */}
        <mesh position={[1.5, 1.7, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.1, 0.9, 1.8]} />
          <primitive object={material} />
        </mesh>
        
        {/* Headlights */}
        <mesh ref={(el) => { if (el) headlightsRef.current[0] = el; }} position={[-2.5, 0.5, 0.8]}>
          <sphereGeometry args={[0.25, 12, 12]} />
          <primitive object={material} />
        </mesh>
        <mesh ref={(el) => { if (el) headlightsRef.current[1] = el; }} position={[-2.5, 0.5, -0.8]}>
          <sphereGeometry args={[0.25, 12, 12]} />
          <primitive object={material} />
        </mesh>
        
        {/* Taillights */}
        <mesh position={[2.5, 0.5, 0.9]}>
          <boxGeometry args={[0.1, 0.3, 0.4]} />
          <primitive object={material} />
        </mesh>
        <mesh position={[2.5, 0.5, -0.9]}>
          <boxGeometry args={[0.1, 0.3, 0.4]} />
          <primitive object={material} />
        </mesh>
        
        {/* Side mirrors */}
        <mesh position={[-0.5, 1.2, 1.4]}>
          <boxGeometry args={[0.3, 0.2, 0.4]} />
          <primitive object={material} />
        </mesh>
        <mesh position={[-0.5, 1.2, -1.4]}>
          <boxGeometry args={[0.3, 0.2, 0.4]} />
          <primitive object={material} />
        </mesh>
        
        {/* Door handles */}
        <mesh position={[0, 0.8, 1.26]}>
          <boxGeometry args={[0.4, 0.1, 0.05]} />
          <primitive object={material} />
        </mesh>
        <mesh position={[0, 0.8, -1.26]}>
          <boxGeometry args={[0.4, 0.1, 0.05]} />
          <primitive object={material} />
        </mesh>
      </group>
      
      {/* Wheels - Front Left */}
      <group ref={(el) => { if (el) wheelsRef.current[0] = el; }} position={[-1.5, 0.5, 1.5]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.5, 0.5, 0.4, 16]} />
          <primitive object={material} />
        </mesh>
        {/* Wheel spokes */}
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} rotation={[0, 0, (i / 5) * Math.PI * 2]}>
            <boxGeometry args={[0.1, 0.8, 0.1]} />
            <primitive object={material} />
          </mesh>
        ))}
      </group>
      
      {/* Wheels - Front Right */}
      <group ref={(el) => { if (el) wheelsRef.current[1] = el; }} position={[-1.5, 0.5, -1.5]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.5, 0.5, 0.4, 16]} />
          <primitive object={material} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} rotation={[0, 0, (i / 5) * Math.PI * 2]}>
            <boxGeometry args={[0.1, 0.8, 0.1]} />
            <primitive object={material} />
          </mesh>
        ))}
      </group>
      
      {/* Wheels - Rear Left */}
      <group ref={(el) => { if (el) wheelsRef.current[2] = el; }} position={[1.5, 0.5, 1.5]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.5, 0.5, 0.4, 16]} />
          <primitive object={material} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} rotation={[0, 0, (i / 5) * Math.PI * 2]}>
            <boxGeometry args={[0.1, 0.8, 0.1]} />
            <primitive object={material} />
          </mesh>
        ))}
      </group>
      
      {/* Wheels - Rear Right */}
      <group ref={(el) => { if (el) wheelsRef.current[3] = el; }} position={[1.5, 0.5, -1.5]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.5, 0.5, 0.4, 16]} />
          <primitive object={material} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} rotation={[0, 0, (i / 5) * Math.PI * 2]}>
            <boxGeometry args={[0.1, 0.8, 0.1]} />
            <primitive object={material} />
          </mesh>
        ))}
      </group>
      
      {/* Exhaust particles */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[3 + i * 0.5, 0.3, 0]}>
          <sphereGeometry args={[0.1 + i * 0.03, 8, 8]} />
          <primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}`
    };
  }
  
  // Heart template
  if (/\b(heart|love|valentine|romantic|pulse|beat)\b/.test(normalizedPrompt)) {
    return {
      name: "Beating Heart",
      emoji: "❤️",
      code: `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function HeartVisualizer({ audioData }: { audioData: { frequency: number[]; amplitude: number; beatStrength: number; } }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const lastBeat = useRef(0);
  const beatScale = useRef(1);
  
  // Create heart shape with spheres
  const heartPoints = useMemo(() => {
    const points = [];
    // Heart parametric equation
    for (let t = 0; t < Math.PI * 2; t += 0.15) {
      for (let layer = 0; layer < 5; layer++) {
        const layerScale = 1 - layer * 0.15;
        const x = 16 * Math.pow(Math.sin(t), 3) * layerScale * 0.3;
        const y = (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * layerScale * 0.3;
        const z = (layer - 2) * 0.5;
        points.push({ x, y, z, t, layer, fi: Math.floor((t / (Math.PI * 2)) * 255) });
      }
    }
    return points;
  }, []);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const time = clock.getElapsedTime();
    
    // Calculate bass
    const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, bassRaw, 0.15);
    const bass = smoothedBass.current * audioSensitivity.bassMultiplier;
    
    // Beat detection for heartbeat effect
    if (audioData.beatStrength > 0.5 && time - lastBeat.current > 0.3) {
      beatScale.current = 1.3;
      lastBeat.current = time;
    }
    beatScale.current = THREE.MathUtils.lerp(beatScale.current, 1, 0.08);
    
    // Main heartbeat scale
    const pulseScale = beatScale.current + bass * 0.3;
    groupRef.current.scale.setScalar(pulseScale);
    
    // Gentle rotation
    groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.2;
    groupRef.current.rotation.z = Math.sin(time * 0.3) * 0.1;
    
    // Animate individual points
    groupRef.current.children.forEach((child, i) => {
      const point = heartPoints[i];
      if (!child || !point) return;
      
      const freq = audioData.frequency[point.fi] || 0;
      const response = (freq / 255) * audioSensitivity.frequency;
      
      // Radial pulse effect
      const pulseOffset = Math.sin(time * 4 + point.t * 2) * response * 0.2;
      const scale = 0.3 + response * 0.2 + pulseOffset * 0.5;
      child.scale.setScalar(scale);
      
      // Slight position variation
      child.position.x = point.x + Math.sin(time * 2 + i * 0.1) * response * 0.3;
      child.position.y = point.y + Math.cos(time * 2 + i * 0.1) * response * 0.3;
    });
  });
  
  const material = createVisualizerMaterial('#ffffff');
  
  return (
    <group ref={groupRef}>
      {heartPoints.map((point, i) => (
        <mesh key={i} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}`
    };
  }
  
  // Star template
  if (/\b(star|stars|stellar|cosmic|twinkle|sparkle)\b/.test(normalizedPrompt)) {
    return {
      name: "Spinning Star",
      emoji: "⭐",
      code: `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function StarVisualizer({ audioData }: { audioData: { frequency: number[]; amplitude: number; beatStrength: number; } }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  
  // Create multi-layered star with particles
  const starParts = useMemo(() => {
    const parts = [];
    const points = 5;
    
    // Main star points
    for (let layer = 0; layer < 4; layer++) {
      const layerScale = 1 - layer * 0.2;
      const z = layer * 0.5 - 0.75;
      
      for (let i = 0; i < points * 2; i++) {
        const angle = (i / (points * 2)) * Math.PI * 2;
        const isOuter = i % 2 === 0;
        const radius = isOuter ? 5 * layerScale : 2 * layerScale;
        
        parts.push({
          type: 'point',
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          z,
          angle,
          isOuter,
          layer,
          fi: Math.floor((i / (points * 2)) * 255)
        });
      }
    }
    
    // Connecting beams
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      for (let j = 0; j < 8; j++) {
        const t = j / 7;
        const radius = 2 + t * 3;
        parts.push({
          type: 'beam',
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          z: 0,
          angle,
          t,
          fi: Math.floor((i / points) * 255)
        });
      }
    }
    
    // Sparkle particles around
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 4;
      parts.push({
        type: 'sparkle',
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: (Math.random() - 0.5) * 3,
        phase: Math.random() * Math.PI * 2,
        fi: Math.floor(Math.random() * 255)
      });
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
    
    // Star rotation and scale
    groupRef.current.rotation.z = time * audioSensitivity.animationSpeed * 0.3 + bass * 0.5;
    groupRef.current.scale.setScalar(1 + bass * 0.2 + audioData.beatStrength * 0.15);
    
    groupRef.current.children.forEach((child, i) => {
      const part = starParts[i];
      if (!child || !part) return;
      
      const freq = audioData.frequency[part.fi] || 0;
      const response = (freq / 255) * audioSensitivity.frequency;
      
      if (part.type === 'point') {
        child.scale.setScalar(0.4 + response * 0.3 + (part.isOuter ? bass * 0.2 : 0));
      } else if (part.type === 'beam') {
        child.scale.setScalar(0.2 + response * 0.2);
        child.position.x = part.x * (1 + mids * 0.2);
        child.position.y = part.y * (1 + mids * 0.2);
      } else if (part.type === 'sparkle') {
        const twinkle = Math.sin(time * 5 + part.phase) * 0.5 + 0.5;
        child.scale.setScalar(0.1 + twinkle * 0.15 + response * 0.1);
      }
    });
  });
  
  const material = createVisualizerMaterial('#ffffff');
  
  return (
    <group ref={groupRef}>
      {starParts.map((part, i) => (
        <mesh key={i} position={[part.x, part.y, part.z]}>
          <sphereGeometry args={[part.type === 'sparkle' ? 0.15 : 0.4, 8, 8]} />
          <primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}`
    };
  }
  
  // Airplane fleet template
  if (/\b(airplane|aircraft|plane|jet|fighter)\b/.test(normalizedPrompt)) {
    return {
      name: "Airplane Fleet",
      emoji: "✈️",
      code: `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function AirplaneFleetVisualizer({ audioData }: { audioData: { frequency: number[]; amplitude: number; beatStrength: number; } }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  
  const airplanes = useMemo(() => {
    const planes = [];
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const radius = 8 + Math.sin(i * 0.3) * 4;
      planes.push({
        id: i,
        x: Math.cos(angle) * radius,
        y: Math.sin(i * 0.7) * 3,
        z: Math.sin(angle) * radius,
        rotation: [Math.random() * 0.3, angle, Math.random() * 0.2],
        scale: 0.6 + Math.random() * 0.3,
        freqIndex: Math.floor((i / 60) * 255)
      });
    }
    return planes;
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
    
    // Fleet rotation
    groupRef.current.rotation.y = time * 0.1 * audioSensitivity.animationSpeed;
    
    airplanes.forEach((plane, i) => {
      const freq = audioData.frequency[plane.freqIndex] || 0;
      const response = (freq / 255) * audioSensitivity.frequency;
      
      // Each plane is a group with 4 children (fuselage, wings, tail, propeller)
      const planeGroup = groupRef.current?.children[i];
      if (planeGroup) {
        planeGroup.rotation.z = Math.sin(time + i * 0.2) * 0.3 + response * 0.5;
        planeGroup.rotation.y = time * 0.1 + i * 0.05;
        planeGroup.position.y = plane.y + Math.sin(time + i * 0.3) * 1.5 + response * 2 + audioData.beatStrength * 1.5;
        planeGroup.scale.setScalar(plane.scale + response * 0.3);
        
        // Spin propeller (last child)
        const propeller = planeGroup.children[3];
        if (propeller) {
          propeller.rotation.z = time * 20 + mids * 10;
        }
      }
    });
  });
  
  const material = createVisualizerMaterial('#ffffff');
  
  return (
    <group ref={groupRef}>
      {airplanes.map((plane) => (
        <group key={plane.id} position={[plane.x, plane.y, plane.z]} rotation={plane.rotation}>
          {/* Fuselage */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.35, 2.5, 8]} />
            <primitive object={material} />
          </mesh>
          {/* Wings */}
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[4, 0.12, 0.7]} />
            <primitive object={material} />
          </mesh>
          {/* Tail */}
          <mesh position={[0, 0.6, -1]} rotation={[Math.PI / 4, 0, 0]}>
            <boxGeometry args={[1.3, 0.12, 1]} />
            <primitive object={material} />
          </mesh>
          {/* Propeller */}
          <mesh position={[0, 0, 1.3]}>
            <boxGeometry args={[0.08, 1.8, 0.08]} />
            <primitive object={material} />
          </mesh>
        </group>
      ))}
    </group>
  );
}`
    };
  }
  
  // Flower/petal template
  if (/\b(flowers?|petals?|blossoms?|blooms?)\b/.test(normalizedPrompt) && /\b(winds?|breeze|blow|danc|sway|mov|flutter)\b/.test(normalizedPrompt)) {
    return {
      name: "Flower Petals Dancing in Wind",
      emoji: "🌸",
      code: `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function FlowerPetalsVisualizer({ audioData }: { audioData: { frequency: number[]; amplitude: number; beatStrength: number; } }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  
  const flowers = useMemo(() => {
    const arr = [];
    const flowerCount = 20;
    const petalsPerFlower = 8;
    
    for (let f = 0; f < flowerCount; f++) {
      const angle = (f / flowerCount) * Math.PI * 2;
      const radius = 5 + Math.sin(f * 0.4) * 2;
      const flower = {
        id: f,
        x: Math.cos(angle) * radius,
        y: Math.sin(f * 0.5) * 1,
        z: Math.sin(angle) * radius,
        petals: Array.from({ length: petalsPerFlower }, (_, p) => ({
          id: p,
          angle: (p / petalsPerFlower) * Math.PI * 2,
          phase: Math.random() * Math.PI * 2
        })),
        fi: Math.floor((f / flowerCount) * 255)
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
      
      // Wind effect
      const windX = Math.sin(t * 0.6 + flower.id * 0.3) * 0.4;
      const windZ = Math.sin(t * 0.8 + flower.id * 0.2) * 0.3;
      
      flower.petals.forEach((petal) => {
        const child = groupRef.current?.children[childIndex];
        if (child) {
          const petalX = flower.x + Math.cos(petal.angle) * 1.2;
          const petalZ = flower.z + Math.sin(petal.angle) * 1.2;
          const swayX = Math.sin(t * 0.9 + petal.phase) * (0.4 + response);
          const swayZ = Math.sin(t * 1.1 + petal.phase * 1.2) * (0.3 + response);
          
          child.position.set(
            petalX + windX + swayX,
            flower.y + response * 1.2,
            petalZ + windZ + swayZ
          );
          child.rotation.set(
            Math.sin(t + petal.phase) * 0.3,
            petal.angle + t * 0.1,
            Math.cos(t * 0.8 + petal.phase) * 0.4 + response * 0.2
          );
          child.scale.setScalar(0.8 + response * 0.3);
        }
        childIndex++;
      });
      
      // Flower center
      const centerChild = groupRef.current?.children[childIndex];
      if (centerChild) {
        centerChild.position.set(flower.x + windX * 0.3, flower.y + response * 0.6, flower.z + windZ * 0.3);
        centerChild.scale.setScalar(0.6 + response * 0.4);
      }
      childIndex++;
    });
  });
  
  const material = createVisualizerMaterial('#ffffff');
  
  return (
    <group ref={groupRef}>
      {flowers.map((flower) => (
        <React.Fragment key={flower.id}>
          {flower.petals.map((petal) => (
            <mesh key={\`\${flower.id}-\${petal.id}\`}>
              <sphereGeometry args={[0.4, 8, 8]} />
              <primitive object={material} />
            </mesh>
          ))}
          <mesh>
            <sphereGeometry args={[0.3, 8, 8]} />
            <primitive object={material} />
          </mesh>
        </React.Fragment>
      ))}
      {/* Floating particles */}
      {Array.from({ length: 30 }, (_, i) => (
        <mesh key={\`p-\${i}\`} position={[(Math.random() - 0.5) * 20, Math.random() * 10, (Math.random() - 0.5) * 20]}>
          <sphereGeometry args={[0.1, 6, 6]} />
          <primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}`
    };
  }
  
  // Robot army template
  if (/\b(robot|android|mech|machine|droid|army|march)\b/.test(normalizedPrompt)) {
    return {
      name: "Robot Army March",
      emoji: "🤖",
      code: `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function RobotArmyVisualizer({ audioData }: { audioData: { frequency: number[]; amplitude: number; beatStrength: number; } }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const marchPhase = useRef(0);
  
  const robots = useMemo(() => {
    const arr = [];
    const rows = 5;
    const cols = 8;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        arr.push({
          id: r * cols + c,
          x: (c - cols / 2) * 2.5,
          z: (r - rows / 2) * 2.5,
          phase: (r + c) * 0.3,
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
    
    // March rhythm
    marchPhase.current += audioSensitivity.animationSpeed * 0.05 * (1 + bass * 2);
    
    robots.forEach((robot, i) => {
      const freq = audioData.frequency[robot.fi] || 0;
      const response = (freq / 255) * audioSensitivity.frequency;
      
      // Each robot is a group with body parts (head, torso, arms, legs)
      const robotGroup = groupRef.current?.children[i];
      if (!robotGroup) return;
      
      // March hop
      const marchY = Math.abs(Math.sin(marchPhase.current + robot.phase)) * (0.3 + bass * 0.5);
      robotGroup.position.y = marchY;
      
      // Body sway
      robotGroup.rotation.z = Math.sin(marchPhase.current + robot.phase) * 0.1;
      
      // Head bob (first child)
      const head = robotGroup.children[0];
      if (head) {
        head.rotation.y = Math.sin(t * 2 + i * 0.1) * 0.2 + response * 0.3;
        head.scale.setScalar(1 + response * 0.2);
      }
      
      // Arm swing (children 2 and 3)
      const leftArm = robotGroup.children[2];
      const rightArm = robotGroup.children[3];
      if (leftArm) leftArm.rotation.x = Math.sin(marchPhase.current + robot.phase) * 0.6;
      if (rightArm) rightArm.rotation.x = -Math.sin(marchPhase.current + robot.phase) * 0.6;
      
      // Leg movement (children 4 and 5)
      const leftLeg = robotGroup.children[4];
      const rightLeg = robotGroup.children[5];
      if (leftLeg) leftLeg.rotation.x = -Math.sin(marchPhase.current + robot.phase) * 0.4;
      if (rightLeg) rightLeg.rotation.x = Math.sin(marchPhase.current + robot.phase) * 0.4;
    });
  });
  
  const material = createVisualizerMaterial('#ffffff');
  
  return (
    <group ref={groupRef}>
      {robots.map((robot) => (
        <group key={robot.id} position={[robot.x, 0, robot.z]}>
          {/* Head */}
          <mesh position={[0, 2.2, 0]}>
            <boxGeometry args={[0.6, 0.6, 0.6]} />
            <primitive object={material} />
          </mesh>
          {/* Torso */}
          <mesh position={[0, 1.4, 0]}>
            <boxGeometry args={[0.8, 1, 0.5]} />
            <primitive object={material} />
          </mesh>
          {/* Left Arm */}
          <mesh position={[-0.6, 1.4, 0]}>
            <boxGeometry args={[0.2, 0.8, 0.2]} />
            <primitive object={material} />
          </mesh>
          {/* Right Arm */}
          <mesh position={[0.6, 1.4, 0]}>
            <boxGeometry args={[0.2, 0.8, 0.2]} />
            <primitive object={material} />
          </mesh>
          {/* Left Leg */}
          <mesh position={[-0.25, 0.4, 0]}>
            <boxGeometry args={[0.25, 0.8, 0.25]} />
            <primitive object={material} />
          </mesh>
          {/* Right Leg */}
          <mesh position={[0.25, 0.4, 0]}>
            <boxGeometry args={[0.25, 0.8, 0.25]} />
            <primitive object={material} />
          </mesh>
          {/* Eyes */}
          <mesh position={[-0.15, 2.3, 0.31]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <primitive object={material} />
          </mesh>
          <mesh position={[0.15, 2.3, 0.31]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <primitive object={material} />
          </mesh>
          {/* Antenna */}
          <mesh position={[0, 2.6, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
            <primitive object={material} />
          </mesh>
          <mesh position={[0, 2.8, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <primitive object={material} />
          </mesh>
        </group>
      ))}
    </group>
  );
}`
    };
  }
  
  return null;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  // Hoisted variables for catch usage across the whole request
  let finalCode: string | null = null;
  let finalName: string | null = null;
  let finalEmoji: string | null = null;

  try {
    const { prompt, referenceImage, mixStyles, userId } = await req.json();
    
    if (!prompt && !referenceImage && !mixStyles?.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'Prompt, reference image, or mix styles required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isPreviewOnly = !userId;
    console.log('Generating visualizer for prompt:', prompt, 'userId:', userId, 'isPreviewOnly:', isPreviewOnly);
    
    // Check for semantic templates first
    const semanticTemplate = getSemanticTemplate(prompt);
    
    let visualizerCode: string;
    let visualizerName: string;
    let previewEmoji: string;
    
    if (semanticTemplate) {
      // Use semantic template directly without LLM rewriting
      visualizerCode = semanticTemplate.code;
      visualizerName = semanticTemplate.name;
      previewEmoji = semanticTemplate.emoji;
      console.log('Using semantic template for:', visualizerName);
      // Save for catch fallback
      finalCode = visualizerCode;
      finalName = visualizerName;
      finalEmoji = previewEmoji;
    } else {
      // Generate with LLM for custom prompts
      const detectedGeometry = detectGeometry(prompt);
      console.log('Detected geometry:', detectedGeometry);

      const systemPrompt = `You are a React Three Fiber audio visualizer generator. Create COMPLEX audio-reactive 3D scenes.

CRITICAL STRUCTURE REQUIREMENTS:
1. Always use this exact import pattern at the top (they will be stripped but used for reference):
   import React, { useRef, useMemo } from 'react';
   import { useFrame } from '@react-three/fiber';
   import { useStudioStore } from '@/stores/studioStore';
   import { createVisualizerMaterial } from '@/lib/visualizerUtils';
   import * as THREE from 'three';

2. Always access audioSensitivity from the store:
   const audioSensitivity = useStudioStore((state) => state.audioSensitivity);

3. Calculate frequency bands like this:
   const bassRaw = audioData.frequency.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255;
   const midsRaw = audioData.frequency.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255;
   const highsRaw = audioData.frequency.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255;

4. Use ASYMMETRIC smoothing with refs for punchy, accurate beat response:
   const smoothedBass = useRef(0);
   // Fast attack (0.55), fast decay (0.35) for accurate beat tracking
   const lerpFactor = bassRaw > smoothedBass.current ? 0.55 : 0.35;
   smoothedBass.current = smoothedBass.current + (bassRaw - smoothedBass.current) * lerpFactor;
   // Add 30% raw audio for transient punch
   const bass = smoothedBass.current * 0.7 + bassRaw * 0.3;

5. Apply audioSensitivity multipliers after smoothing:
   const finalBass = bass * audioSensitivity.bassMultiplier;
   const finalMids = mids * audioSensitivity.midsMultiplier;
   const finalHighs = highs * audioSensitivity.highsMultiplier;
   
6. Use createVisualizerMaterial() for ALL materials - NO colors allowed
   const material = createVisualizerMaterial();
   <primitive object={material} />

7. Target scale: entire scene should fit in ~8-12 unit radius

8. Component signature: 
   export default function CustomVisualizer({ audioData }: { audioData: { frequency: number[]; amplitude: number; beatStrength: number; } })

ONLY use these geometries: boxGeometry, sphereGeometry, cylinderGeometry, coneGeometry, torusGeometry, planeGeometry

Create 50-200 individual mesh components for complex, detailed scenes.`;

      const userPrompt = `Create a detailed audio-reactive 3D visualizer for: "${prompt}"

Requirements:
- Create a recognizable, complex ${prompt} shape using multiple meshes (50-200 components)
- All white materials via createVisualizerMaterial()
- Bass (0-85): major movements, size pulses, use beatStrength for kick detection
- Mids (86-170): rotations, secondary animations  
- Highs (171-255): fine details, particle effects
- Use audioData.beatStrength for beat-synced effects - this is critical for kick/808 response
- Use ASYMMETRIC smoothing: attack 0.55, decay 0.35, plus 30% raw audio blend for transient punch
- Make it visually impressive and clearly reactive to audio with obvious beat pops
- Make it visually impressive and clearly reactive to audio`;

      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Try LLM generation with gpt-4o (stable model)
      const tryGenerateWithLLM = async (): Promise<string | null> => {
        try {
          console.log('Calling OpenAI API with gpt-4o...');
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              max_tokens: 4000,
              temperature: 0.7
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API error:', response.status, errorText);
            throw new Error(`OpenAI API error: ${response.status}`);
          }
          const data = await response.json();
          console.log('OpenAI response received successfully');
          return data.choices?.[0]?.message?.content || null;
        } catch (e) {
          console.error('OpenAI generation failed, using fallback:', e);
          return null;
        }
      };

      let rawCode = await tryGenerateWithLLM();
      if (!rawCode) {
        // Fallback: Procedural geometric pattern reacting to audio
        console.log('Using fallback visualizer code');
        rawCode = `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';
import * as THREE from 'three';

export default function FallbackVisualizer({ audioData }: { audioData: { frequency: number[]; amplitude: number; beatStrength: number; } }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  
  const items = useMemo(() => {
    const arr: { x:number; y:number; z:number; r:number; fi:number }[] = [];
    const count = 120;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = 5 + (i % 8) * 0.6;
      arr.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        y: Math.sin(i * 0.2) * 2.5,
        r: Math.random() * Math.PI,
        fi: Math.floor((i / count) * 255)
      });
    }
    return arr;
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
    
    groupRef.current.rotation.y = t * 0.1 * audioSensitivity.animationSpeed;
    
    groupRef.current.children.forEach((child, i) => {
      const it = items[i];
      if (!it) return;
      const f = audioData.frequency[it.fi] || 0;
      const response = (f / 255) * audioSensitivity.frequency + audioData.beatStrength * 0.5;
      child.rotation.y = it.r + Math.sin(t + i * 0.03) * 0.4;
      child.rotation.x = Math.sin(t * 0.3 + i * 0.02) * (0.3 + response * 0.5);
      child.position.y = it.y + Math.sin(t + i * 0.04) * (0.5 + response * 1.5);
      (child as any).scale.setScalar(0.8 + response * 0.6 + bass * 0.3);
    });
  });

  const material = createVisualizerMaterial();
  return (
    <group ref={groupRef}>
      {items.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} rotation={[0, p.r, 0]}>
          <boxGeometry args={[0.5, 1, 0.25]} />
          <primitive object={material} />
        </mesh>
      ))}
    </group>
  );
}
`;
      }

      visualizerCode = rawCode;

      // Sanitize and normalize the generated code
      const allowSanitize = (code: string) => {
        let sanitized = code
        .replace(/```[a-z]*\n?/gi, '')
        .replace(/```/g, '')
        .trim()
        // Remove imports (keep exports so client can detect default export)
        .replace(/^import\s+.*$/gm, '')
        // Legacy compatibility: Fix old store access patterns
        .replace(/useStudioStore\(\([^)]*\)\s*=>\s*[^)]*\.sensitivity\)/g, 'useStudioStore((state) => state.audioSensitivity)')
        .replace(/sensitivity\s*\*\s*/g, 'audioSensitivity.frequency * ')
        .replace(/\bsensitivity\b(?!\s*[:=])/g, 'audioSensitivity.frequency')
        // Enforce white materials
        .replace(/color\s*[:=]\s*["'][^"']*["']/g, '')
        .replace(/<mesh(Standard|Basic|Phong|Lambert|Physical)Material[^>]*\/?>(?:<\/mesh\1Material>)?/g, '<primitive object={material} />')
        // Convert common HTML elements to groups (HTML isn't allowed inside Canvas)
        .replace(/<\/?(div|span|button|p|img|video|canvas)(\s|>)/gi, (m) => {
          return m.replace(/(div|span|button|p|img|video|canvas)/i, 'group');
        });
        
        // Inject material declaration if missing but primitive object={material} is used
        if (sanitized.includes('<primitive object={material}') && !sanitized.includes('const material = createVisualizerMaterial')) {
          const insertPoint = sanitized.indexOf('return (');
          if (insertPoint !== -1) {
            sanitized = sanitized.slice(0, insertPoint) + 'const material = createVisualizerMaterial();\n\n  ' + sanitized.slice(insertPoint);
          }
        }
        
        return sanitized;
      };

      visualizerCode = allowSanitize(visualizerCode);

      // Generate name and emoji
      const words = prompt.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1));
      visualizerName = words.join(' ') + ' Visualizer';

      // Emoji mapping
      const emojiMap: Record<string, string> = {
        forest: '🌲', city: '🏙️', ocean: '🌊', space: '🌌', fire: '🔥',
        ice: '❄️', crystal: '💎', energy: '⚡', magic: '✨', flower: '🌸',
        mountain: '🏔️', desert: '🏜️', jungle: '🌿', volcano: '🌋', aurora: '🌌',
        skull: '💀', dragon: '🐉', moon: '🌙', sun: '☀️', planet: '🪐',
        galaxy: '🌀', wave: '🌊', tree: '🌳', bird: '🐦', fish: '🐟',
        butterfly: '🦋', snake: '🐍', wolf: '🐺', lion: '🦁', eagle: '🦅'
      };
      
      previewEmoji = Object.entries(emojiMap).find(([key]) => 
        prompt.toLowerCase().includes(key)
      )?.[1] || '✨';

      // Save for catch fallback
      finalCode = visualizerCode;
      finalName = visualizerName;
      finalEmoji = previewEmoji;
    }

    // Store in database or return preview if preview-only
    if (isPreviewOnly) {
      // Preview mode: return code without saving to database
      console.log('Returning preview-only response');
      return new Response(
        JSON.stringify({
          success: false,
          code: visualizerCode,
          name: visualizerName,
          emoji: previewEmoji || '🌟'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // 200 because we have usable code
        }
      );
    }

    // Store in database for authenticated users
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: visualizer, error } = await supabase
      .from('custom_visualizers')
      .insert({
        user_id: userId,
        name: visualizerName,
        description: `Generated from prompt: ${prompt}`,
        prompt: prompt,
        jsx_code: visualizerCode,
        scale_factor: 0.25, // Default scale to match standard visualizers
        preview_emoji: previewEmoji,
        is_public: false
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Failed to save visualizer: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        visualizer,
        message: 'Visualizer generated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Generation error:', error);
    console.log('Environment check:', {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasSupabaseKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasOpenAIKey: !!Deno.env.get('OPENAI_API_KEY')
    });
    
    // Always return the generated code even if DB save failed
    if (finalCode && finalName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || 'Failed to save visualizer to database',
          code: finalCode,
          name: finalName,
          emoji: finalEmoji || '🌟'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // 200 because we have usable code
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate visualizer'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
