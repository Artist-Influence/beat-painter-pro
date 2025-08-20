
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
  
  // Airplane fleet template - creates 50-150 individual planes
  if (/\b(airplane|aircraft|plane|jet|fighter)\b/.test(normalizedPrompt)) {
    return {
      name: "Airplane Fleet",
      emoji: "✈️",
      code: `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';

export default function AirplaneFleetVisualizer({ audioData }: { audioData: { frequency: number[]; amplitude: number; beatStrength: number; } }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const airplanes = useMemo(() => {
    const planes = [];
    for (let i = 0; i < 80; i++) {
      const angle = (i / 80) * Math.PI * 2;
      const radius = 15 + Math.sin(i * 0.3) * 8;
      planes.push({
        id: i,
        x: Math.cos(angle) * radius,
        y: Math.sin(i * 0.7) * 5,
        z: Math.sin(angle) * radius,
        rotation: [Math.random() * 0.3, angle, Math.random() * 0.2],
        scale: 0.8 + Math.random() * 0.4,
        freqIndex: Math.floor((i / 80) * (audioData.frequency.length - 1))
      });
    }
    return planes;
  }, [audioData.frequency.length]);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const time = clock.getElapsedTime();
    const avgFreq = audioData.frequency.reduce((a, b) => a + b, 0) / audioData.frequency.length;
    
    airplanes.forEach((plane, i) => {
      const freq = audioData.frequency[plane.freqIndex] || 0;
      const child = groupRef.current.children[i];
      if (child) {
        // Banking motion based on audio
        child.rotation.z = Math.sin(time + i * 0.2) * 0.3 + freq * audioSensitivity.frequency * 0.5;
        child.rotation.y = time * 0.1 + i * 0.05;
        child.position.y = plane.y + Math.sin(time + i * 0.3) * 2 + freq * audioSensitivity.frequency * 3 + audioData.beatStrength * 2;
        child.scale.setScalar(plane.scale + freq * audioSensitivity.frequency * 0.3 + audioData.amplitude * 0.2);
      }
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      {airplanes.map((plane) => (
        <group key={plane.id} position={[plane.x, plane.y, plane.z]} rotation={plane.rotation}>
          {/* Fuselage */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.5, 4, 8]} />
            <primitive object={material} />
          </mesh>
          {/* Wings */}
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[6, 0.2, 1]} />
            <primitive object={material} />
          </mesh>
          {/* Tail */}
          <mesh position={[0, 1, -1.5]} rotation={[Math.PI / 4, 0, 0]}>
            <boxGeometry args={[2, 0.2, 1.5]} />
            <primitive object={material} />
          </mesh>
          {/* Propeller */}
          <mesh position={[0, 0, 2]}>
            <boxGeometry args={[0.1, 3, 0.1]} />
            <primitive object={material} />
          </mesh>
        </group>
      ))}
    </group>
  );
}`
    };
  }
  
  // Flower/petal template - creates dancing petals in wind with robust matching
  if (/\b(flowers?|petals?|petal\w*|blossoms?|blooms?)\b/.test(normalizedPrompt) && /\b(winds?|wind\w*|breeze\w*|blow\w*|gust\w*|danc\w*|sway\w*|mov\w*|flutter\w*)\b/.test(normalizedPrompt)) {
    return {
      name: "Flower Petals Dancing in Wind",
      emoji: "🌸",
      code: `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';

export default function FlowerPetalsVisualizer({ audioData }: { audioData: { frequency: number[]; amplitude: number; beatStrength: number; } }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const flowers = useMemo(() => {
    const flowerArray = [];
    const flowerCount = 25;
    const petalsPerFlower = 12;
    
    for (let f = 0; f < flowerCount; f++) {
      const flowerAngle = (f / flowerCount) * Math.PI * 2;
      const flowerRadius = 6 + Math.sin(f * 0.4) * 3 + Math.cos(f * 0.7) * 2;
      const flowerX = Math.cos(flowerAngle) * flowerRadius;
      const flowerZ = Math.sin(flowerAngle) * flowerRadius;
      const flowerY = Math.sin(f * 0.5) * 1.5 + Math.cos(f * 0.3) * 1;
      
      const flower = {
        id: f,
        center: [flowerX, flowerY, flowerZ],
        petals: [] as any[],
        freqIndex: Math.floor((f / flowerCount) * (audioData.frequency.length - 1))
      };
      
      for (let p = 0; p < petalsPerFlower; p++) {
        const petalAngle = (p / petalsPerFlower) * Math.PI * 2;
        const petalDistance = 1.8 + Math.sin(p * 0.5) * 0.3;
        
        flower.petals.push({
          id: p,
          angle: petalAngle,
          distance: petalDistance,
          baseRotation: [
            Math.random() * 0.4 - 0.2,
            petalAngle,
            Math.random() * 0.6 - 0.3
          ],
          scale: 0.9 + Math.random() * 0.2,
          swayPhase: Math.random() * Math.PI * 2,
          twistPhase: Math.random() * Math.PI * 2
        });
      }
      
      flowerArray.push(flower);
    }
    return flowerArray;
  }, [audioData.frequency.length]);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const time = clock.getElapsedTime();
    
    flowers.forEach((flower, flowerIndex) => {
      const freq = audioData.frequency[flower.freqIndex] || 0;
      const bassResponse = freq * audioSensitivity.frequency + audioData.beatStrength;
      
      // Wind field calculations
      const windX = Math.sin(time * 0.6 + flowerIndex * 0.3) * 0.4;
      const windY = Math.cos(time * 0.4 + flowerIndex * 0.5) * 0.2;
      const windZ = Math.sin(time * 0.8 + flowerIndex * 0.2) * 0.3;
      
      flower.petals.forEach((petal, petalIndex) => {
        const childIndex = flowerIndex * (flower.petals.length + 1) + petalIndex;
        const child = groupRef.current?.children[childIndex];
        if (!child) return;
        
        // Calculate petal position with wind sway and audio response
        const petalX = flower.center[0] + Math.cos(petal.angle) * petal.distance;
        const petalZ = flower.center[2] + Math.sin(petal.angle) * petal.distance;
        const petalY = flower.center[1] + Math.sin(petal.angle * 2) * 0.3;
        
        // Apply wind and audio-driven motion
        const swayX = Math.sin(time * 0.9 + petal.swayPhase) * (0.5 + bassResponse);
        const swayY = Math.cos(time * 0.7 + petal.swayPhase * 0.8) * (0.3 + bassResponse * 0.5);
        const swayZ = Math.sin(time * 1.1 + petal.swayPhase * 1.2) * (0.4 + bassResponse);
        
        child.position.set(
          petalX + windX + swayX,
          petalY + windY + swayY + bassResponse * 1.5,
          petalZ + windZ + swayZ
        );
        
        // Petal rotation with natural flutter
        const twistX = petal.baseRotation[0] + Math.sin(time + petal.twistPhase) * 0.4;
        const twistY = petal.baseRotation[1] + time * 0.1 + windX * 0.8;
        const twistZ = petal.baseRotation[2] + Math.cos(time * 0.8 + petal.twistPhase) * 0.5 + bassResponse * 0.3;
        
        child.rotation.set(twistX, twistY, twistZ);
        
        // Dynamic scaling with audio pulse
        child.scale.setScalar(petal.scale * (1 + bassResponse * 0.4));
      });
      
      // Animate flower center
      const centerChildIndex = flowerIndex * (flower.petals.length + 1) + flower.petals.length;
      const centerChild = groupRef.current?.children[centerChildIndex];
      if (centerChild) {
        centerChild.position.set(
          flower.center[0] + windX * 0.3,
          flower.center[1] + windY + bassResponse * 0.8,
          flower.center[2] + windZ * 0.3
        );
        centerChild.scale.setScalar(1 + bassResponse * 0.5);
      }
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      {flowers.map((flower) => (
        <group key={flower.id}>
          {/* Render individual petals with realistic curved shapes */}
          {flower.petals.map((petal) => (
            <group key={petal.id}>
              {/* Main petal body - elongated ellipsoid */}
              <mesh>
                <sphereGeometry args={[0.6, 8, 12]} />
                <primitive object={material} />
              </mesh>
              {/* Petal tip - smaller sphere for natural taper */}
              <mesh position={[0, 0.8, 0]}>
                <sphereGeometry args={[0.3, 6, 8]} />
                <primitive object={material} />
              </mesh>
              {/* Petal base - wider connection point */}
              <mesh position={[0, -0.4, 0]}>
                <sphereGeometry args={[0.4, 6, 8]} />
                <primitive object={material} />
              </mesh>
            </group>
          ))}
          
          {/* Flower center - detailed pistil and stamen */}
          <group>
            {/* Main center */}
            <mesh>
              <sphereGeometry args={[0.4, 12, 12]} />
              <primitive object={material} />
            </mesh>
            {/* Small stamen details */}
            {Array.from({ length: 8 }, (_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const radius = 0.25;
              return (
                <mesh
                  key={i}
                  position={[
                    Math.cos(angle) * radius,
                    0.2,
                    Math.sin(angle) * radius
                  ]}
                >
                  <sphereGeometry args={[0.05, 4, 4]} />
                  <primitive object={material} />
                </mesh>
              );
            })}
          </group>
        </group>
      ))}
      
      {/* Floating petal particles for enhanced atmosphere */}
      {Array.from({ length: 40 }, (_, i) => {
        const x = (Math.random() - 0.5) * 30;
        const y = Math.random() * 15 + 5;
        const z = (Math.random() - 0.5) * 30;
        return (
          <mesh
            key={\`particle-\${i}\`}
            position={[x, y, z]}
            rotation={[
              Math.random() * Math.PI,
              Math.random() * Math.PI,
              Math.random() * Math.PI
            ]}
          >
            <sphereGeometry args={[0.15, 6, 8]} />
            <primitive object={material} />
          </mesh>
        );
      })}
    </group>
  );
}`
    };
  }

  // Apple with bite template - creates voxel-style apple
  if (/\b(apple|fruit)\b/.test(normalizedPrompt)) {
    return {
      name: "Apple with Bite",
      emoji: "🍎",
      code: `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';

export default function AppleWithBiteVisualizer({ audioData }: { audioData: { frequency: number[]; amplitude: number; beatStrength: number; } }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const voxels = useMemo(() => {
    const cubes = [];
    const resolution = 20;
    
    for (let x = -resolution; x <= resolution; x++) {
      for (let y = -resolution; y <= resolution; y++) {
        for (let z = -resolution; z <= resolution; z++) {
          const nx = x / resolution;
          const ny = y / resolution;
          const nz = z / resolution;
          
          // Apple shape equation
          const appleShape = nx * nx + ny * ny + nz * nz - 0.8;
          const appleTop = (nx * nx + nz * nz) * 0.3 + (ny - 0.5) * (ny - 0.5) - 0.1;
          
          // Bite shape (remove cubes in bite area)
          const biteX = nx + 0.6;
          const biteShape = biteX * biteX + ny * ny + nz * nz - 0.3;
          
          if ((appleShape < 0 || appleTop < 0) && biteShape > 0) {
            cubes.push({
              x: x * 0.2,
              y: y * 0.2,
              z: z * 0.2,
              freqIndex: Math.floor(((x + resolution) / (resolution * 2)) * (audioData.frequency.length - 1))
            });
          }
        }
      }
    }
    return cubes;
  }, [audioData.frequency.length]);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const time = clock.getElapsedTime();
    
    groupRef.current.children.forEach((child, i) => {
      if (i < voxels.length) {
        const voxel = voxels[i];
        const freq = audioData.frequency[voxel.freqIndex] || 0;
        
        child.position.y = voxel.y + Math.sin(time + i * 0.1) * 0.1 + freq * audioSensitivity.frequency * 0.5 + audioData.beatStrength * 0.3;
        child.scale.setScalar(1 + freq * audioSensitivity.frequency * 0.3 + audioData.amplitude * 0.1);
      }
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      {voxels.map((voxel, i) => (
        <mesh key={i} position={[voxel.x, voxel.y, voxel.z]}>
          <boxGeometry args={[0.15, 0.15, 0.15]} />
          <primitive object={material} />
        </mesh>
      ))}
      {/* Apple stem */}
      <mesh position={[0, 4, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 1, 8]} />
        <primitive object={material} />
      </mesh>
    </group>
  );
}`
    };
  }
  
  // Shield template - creates detailed shield with boss and segments
  if (/\b(shield|armor|protection|guard)\b/.test(normalizedPrompt)) {
    return {
      name: "Medieval Shield",
      emoji: "🛡️",
      code: `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';

export default function MedievalShieldVisualizer({ audioData }: { audioData: { frequency: number[]; amplitude: number; beatStrength: number; } }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const segments = useMemo(() => {
    const parts = [];
    // Radial shield segments
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      parts.push({
        type: 'segment',
        angle,
        radius: 3,
        freqIndex: Math.floor((i / 12) * (audioData.frequency.length - 1))
      });
    }
    // Concentric rings
    for (let r = 1; r <= 4; r++) {
      for (let i = 0; i < 8 * r; i++) {
        const angle = (i / (8 * r)) * Math.PI * 2;
        parts.push({
          type: 'ring',
          angle,
          radius: r * 1.2,
          freqIndex: Math.floor(((i + r * 10) / (8 * r + 40)) * (audioData.frequency.length - 1))
        });
      }
    }
    return parts;
  }, [audioData.frequency.length]);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const time = clock.getElapsedTime();
    const avgFreq = audioData.frequency.reduce((a, b) => a + b, 0) / audioData.frequency.length;
    
    // Rotate entire shield
    groupRef.current.rotation.z = time * 0.1 + avgFreq * audioSensitivity.frequency * 0.5 + audioData.beatStrength * 0.3;
    
    groupRef.current.children.forEach((child, i) => {
      if (i < segments.length) {
        const segment = segments[i];
        const freq = audioData.frequency[segment.freqIndex] || 0;
        
        if (segment.type === 'segment') {
          child.scale.setScalar(1 + freq * audioSensitivity.frequency * 0.4 + audioData.amplitude * 0.2);
          child.position.z = freq * audioSensitivity.frequency * 1 + audioData.beatStrength * 0.5;
        } else {
          child.scale.setScalar(0.8 + freq * audioSensitivity.frequency * 0.3 + audioData.amplitude * 0.1);
        }
      }
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      {/* Main shield body */}
      <mesh>
        <cylinderGeometry args={[4, 3, 0.3, 16]} />
        <primitive object={material} />
      </mesh>
      
      {/* Shield boss (center) */}
      <mesh position={[0, 0, 0.5]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <primitive object={material} />
      </mesh>
      
      {/* Radial segments and rings */}
      {segments.map((segment, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(segment.angle) * segment.radius,
            Math.sin(segment.angle) * segment.radius,
            segment.type === 'segment' ? 0.2 : 0.1
          ]}
        >
          {segment.type === 'segment' ? (
            <boxGeometry args={[0.3, 1.5, 0.2]} />
          ) : (
            <sphereGeometry args={[0.1, 8, 8]} />
          )}
          <primitive object={material} />
        </mesh>
      ))}
      
      {/* Shield rim */}
      <mesh>
        <torusGeometry args={[4, 0.1, 8, 32]} />
        <primitive object={material} />
      </mesh>
    </group>
  );
}`
    };
  }
  
  // Robot army template - creates marching robots reacting to beat
  if (/\b(robot|robots?|army|march|android|mech|cyborg)\b/.test(normalizedPrompt)) {
    return {
      name: "Robot Army March",
      emoji: "🤖",
      code: `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';

export default function RobotArmyVisualizer({ audioData }: { audioData: { frequency: number[]; amplitude: number; beatStrength: number; } }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const robots = useMemo(() => {
    const robotArray = [];
    const rows = 8;
    const cols = 10;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = (col - cols/2) * 3;
        const z = (row - rows/2) * 4;
        const y = 0;
        
        robotArray.push({
          id: row * cols + col,
          position: [x, y, z],
          marchPhase: (row * cols + col) * 0.1,
          freqIndex: Math.floor(((row * cols + col) / (rows * cols)) * (audioData.frequency.length - 1)),
          row,
          col
        });
      }
    }
    return robotArray;
  }, [audioData.frequency.length]);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.frequency.length) return;
    
    const time = clock.getElapsedTime();
    const avgFreq = audioData.frequency.reduce((a, b) => a + b, 0) / audioData.frequency.length;
    const marchSpeed = 0.5 + audioData.beatStrength * 2;
    
    robots.forEach((robot, robotIndex) => {
      const robotGroup = groupRef.current?.children[robotIndex];
      if (!robotGroup) return;
      
      const freq = audioData.frequency[robot.freqIndex] || 0;
      const bassResponse = freq * audioSensitivity.frequency + audioData.beatStrength;
      
      // Marching motion synchronized to beat
      const marchTime = time * marchSpeed + robot.marchPhase;
      const stepHeight = Math.max(0, Math.sin(marchTime * 4)) * (0.3 + bassResponse);
      
      // Robot bouncing to beat
      robotGroup.position.y = robot.position[1] + stepHeight + bassResponse * 0.5;
      robotGroup.position.x = robot.position[0] + Math.sin(marchTime) * 0.1;
      robotGroup.position.z = robot.position[2] + Math.sin(marchTime * 2) * 0.05;
      
      // Robot scaling with audio
      robotGroup.scale.setScalar(1 + bassResponse * 0.2);
      
      // Robot head rotation looking around
      const headChild = robotGroup.children[0]; // Head
      if (headChild) {
        headChild.rotation.y = Math.sin(time + robotIndex * 0.1) * 0.3 + bassResponse * 0.2;
      }
      
      // Arms swinging
      const leftArm = robotGroup.children[3]; // Left arm
      const rightArm = robotGroup.children[4]; // Right arm
      if (leftArm) {
        leftArm.rotation.x = Math.sin(marchTime * 2) * 0.5 + bassResponse * 0.3;
      }
      if (rightArm) {
        rightArm.rotation.x = Math.sin(marchTime * 2 + Math.PI) * 0.5 + bassResponse * 0.3;
      }
      
      // Legs marching
      const leftLeg = robotGroup.children[5]; // Left leg
      const rightLeg = robotGroup.children[6]; // Right leg
      if (leftLeg) {
        leftLeg.rotation.x = Math.sin(marchTime * 4) * 0.4 + bassResponse * 0.2;
      }
      if (rightLeg) {
        rightLeg.rotation.x = Math.sin(marchTime * 4 + Math.PI) * 0.4 + bassResponse * 0.2;
      }
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      {robots.map((robot) => (
        <group key={robot.id} position={robot.position}>
          {/* Head */}
          <mesh position={[0, 3, 0]}>
            <boxGeometry args={[1.2, 1.2, 1.2]} />
            <primitive object={material} />
          </mesh>
          
          {/* Eyes */}
          <mesh position={[-0.3, 3.2, 0.6]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <primitive object={material} />
          </mesh>
          <mesh position={[0.3, 3.2, 0.6]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <primitive object={material} />
          </mesh>
          
          {/* Body */}
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[1.5, 2, 0.8]} />
            <primitive object={material} />
          </mesh>
          
          {/* Left Arm */}
          <group position={[-1, 2.2, 0]}>
            <mesh position={[0, -0.8, 0]}>
              <boxGeometry args={[0.4, 1.6, 0.4]} />
              <primitive object={material} />
            </mesh>
            <mesh position={[0, -1.8, 0]}>
              <boxGeometry args={[0.3, 0.8, 0.3]} />
              <primitive object={material} />
            </mesh>
          </group>
          
          {/* Right Arm */}
          <group position={[1, 2.2, 0]}>
            <mesh position={[0, -0.8, 0]}>
              <boxGeometry args={[0.4, 1.6, 0.4]} />
              <primitive object={material} />
            </mesh>
            <mesh position={[0, -1.8, 0]}>
              <boxGeometry args={[0.3, 0.8, 0.3]} />
              <primitive object={material} />
            </mesh>
          </group>
          
          {/* Left Leg */}
          <group position={[-0.4, 0, 0]}>
            <mesh position={[0, -0.8, 0]}>
              <boxGeometry args={[0.5, 1.6, 0.5]} />
              <primitive object={material} />
            </mesh>
            <mesh position={[0, -1.8, 0]}>
              <boxGeometry args={[0.6, 0.3, 0.8]} />
              <primitive object={material} />
            </mesh>
          </group>
          
          {/* Right Leg */}
          <group position={[0.4, 0, 0]}>
            <mesh position={[0, -0.8, 0]}>
              <boxGeometry args={[0.5, 1.6, 0.5]} />
              <primitive object={material} />
            </mesh>
            <mesh position={[0, -1.8, 0]}>
              <boxGeometry args={[0.6, 0.3, 0.8]} />
              <primitive object={material} />
            </mesh>
          </group>
          
          {/* Antenna */}
          <mesh position={[0, 4, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
            <primitive object={material} />
          </mesh>
          <mesh position={[0, 4.5, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
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
    const { prompt, userId } = await req.json();
    
    if (!prompt || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating visualizer for prompt:', prompt);
    
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

      const systemPrompt = `You are a React Three Fiber visualizer generator. Create a COMPLEX audio-reactive 3D visualizer component.

CRITICAL REQUIREMENTS:
1. Use ONLY white materials via createVisualizerMaterial() - NO colors
2. Create 50-300+ individual mesh components for complex scenes
3. Each mesh must react to different frequency bands from audioData
4. Use only standard R3F geometries: boxGeometry, sphereGeometry, cylinderGeometry, coneGeometry, planeGeometry, torusGeometry
5. Import: useRef, useMemo from 'react', useFrame from '@react-three/fiber', useStudioStore from '@/stores/studioStore', createVisualizerMaterial from '@/lib/visualizerUtils'
6. Component signature: export default function CustomVisualizer({ audioData }: { audioData: number[] })

COMPLEXITY EXAMPLES:
- "Forest" = 100+ individual trees with branches, leaves
- "City" = 200+ buildings, windows, roads, cars
- "Ocean" = 300+ water droplets, waves, fish
- "Galaxy" = 500+ stars, planets, asteroids

Make it visually stunning with intricate details and smooth audio reactivity.`;

      const userPrompt = `Create a complex audio-reactive visualizer for: "${prompt}"

Use detected geometry: ${detectedGeometry}

Requirements:
- 50-300+ individual mesh components
- All white materials only
- Complex, detailed scene
- Smooth audio reactivity
- Each component reacts to different frequencies`;

      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Try LLM generation, fall back to deterministic local template on failure (e.g., 429)
      const tryGenerateWithLLM = async (): Promise<string | null> => {
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-5-2025-08-07',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              max_completion_tokens: 2000
            }),
          });

          if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
          const data = await response.json();
          return data.choices?.[0]?.message?.content || null;
        } catch (e) {
          console.error('OpenAI generation failed, using fallback:', e);
          return null;
        }
      };

      let rawCode = await tryGenerateWithLLM();
      if (!rawCode) {
        // Fallback: Procedural geometric pattern reacting to audio
        rawCode = `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';

export default function FallbackVisualizer({ audioData }: { audioData: { frequency: number[]; amplitude: number; beatStrength: number; } }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  const items = useMemo(() => {
    const arr: { x:number; y:number; z:number; r:number; fi:number }[] = [];
    const count = 120;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = 4 + (i % 8) * 0.5;
      arr.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        y: Math.sin(i * 0.2) * 2,
        r: Math.random() * Math.PI,
        fi: Math.floor((i / count) * (audioData.frequency.length - 1))
      });
    }
    return arr;
  }, [audioData.frequency.length]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const it = items[i];
      if (!it) return;
      const f = audioData.frequency[it.fi] || 0;
      const response = f * audioSensitivity.frequency + audioData.beatStrength;
      child.rotation.y = it.r + Math.sin(t + i * 0.03) * 0.4;
      child.rotation.x = Math.sin(t * 0.3 + i * 0.02) * (0.3 + response * 0.5);
      child.position.y = it.y + Math.sin(t + i * 0.04) * (0.5 + response * 1.5) + audioData.amplitude * 0.3;
      (child as any).scale.setScalar(0.9 + response * 0.6);
    });
  });

  const material = createVisualizerMaterial();
  return (
    <group ref={groupRef}>
      {items.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} rotation={[0, p.r, 0]}>
          <boxGeometry args={[0.4, 0.8, 0.2]} />
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
        })
        // Replace any capitalized JSX elements and namespaced ones with groups
        .replace(/<([A-Z][A-Za-z0-9_.-]*)\b([^>]*)\/>/g, '<group$2 />')
        .replace(/<([A-Z][A-Za-z0-9_.-]*)\b([^>]*)>/g, '<group$2>')
        .replace(/<\/(?:[A-Z][A-Za-z0-9_.-]*)>/g, '</group>');
        
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
      const words = prompt.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1));
      visualizerName = words.join(' ') + ' Visualizer';

      // Emoji mapping
      const emojiMap: Record<string, string> = {
        forest: '🌲', city: '🏙️', ocean: '🌊', space: '🌌', fire: '🔥',
        ice: '❄️', crystal: '💎', energy: '⚡', magic: '✨', flower: '🌸',
        mountain: '🏔️', desert: '🏜️', jungle: '🌿', volcano: '🌋', aurora: '🌌'
      };
      
      previewEmoji = Object.entries(emojiMap).find(([key]) => 
        prompt.toLowerCase().includes(key)
      )?.[1] || '✨';

      // Save for catch fallback
      finalCode = visualizerCode;
      finalName = visualizerName;
      finalEmoji = previewEmoji;
    }

    // Store in database
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
        scale_factor: 1.0,
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
