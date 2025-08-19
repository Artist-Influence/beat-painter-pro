
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

export default function AirplaneFleetVisualizer({ audioData }: { audioData: number[] }) {
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
        freqIndex: Math.floor((i / 80) * (audioData.length - 1))
      });
    }
    return planes;
  }, [audioData.length]);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.length) return;
    
    const time = clock.getElapsedTime();
    const avgFreq = audioData.reduce((a, b) => a + b, 0) / audioData.length;
    
    airplanes.forEach((plane, i) => {
      const freq = audioData[plane.freqIndex] || 0;
      const child = groupRef.current.children[i];
      if (child) {
        // Banking motion based on audio
        child.rotation.z = Math.sin(time + i * 0.2) * 0.3 + freq * audioSensitivity.frequency * 0.5;
        child.rotation.y = time * 0.1 + i * 0.05;
        child.position.y = plane.y + Math.sin(time + i * 0.3) * 2 + freq * audioSensitivity.frequency * 3;
        child.scale.setScalar(plane.scale + freq * audioSensitivity.frequency * 0.3);
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
  
  // Flower/petal template - creates dancing petals in wind
  if (/\b(flower|petal|blossom|bloom)\b/.test(normalizedPrompt) && /\b(wind|breeze|dance|dancing|sway|moving)\b/.test(normalizedPrompt)) {
    return {
      name: "Flower Petals Dancing in Wind",
      emoji: "🌸",
      code: `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';

export default function FlowerPetalsVisualizer({ audioData }: { audioData: number[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const audioSensitivity = useStudioStore((state) => state.audioSensitivity);
  
  const petals = useMemo(() => {
    const petalArray = [];
    const flowerCount = 20;
    const petalsPerFlower = 8;
    
    for (let f = 0; f < flowerCount; f++) {
      const flowerAngle = (f / flowerCount) * Math.PI * 2;
      const flowerRadius = 8 + Math.sin(f * 0.5) * 4;
      const flowerX = Math.cos(flowerAngle) * flowerRadius;
      const flowerZ = Math.sin(flowerAngle) * flowerRadius;
      const flowerY = Math.sin(f * 0.3) * 2;
      
      for (let p = 0; p < petalsPerFlower; p++) {
        const petalAngle = (p / petalsPerFlower) * Math.PI * 2;
        const petalRadius = 1.5 + Math.random() * 0.5;
        
        petalArray.push({
          id: f * petalsPerFlower + p,
          flowerCenter: [flowerX, flowerY, flowerZ],
          localX: Math.cos(petalAngle) * petalRadius,
          localZ: Math.sin(petalAngle) * petalRadius,
          rotation: [Math.random() * 0.5, petalAngle + Math.PI / 2, Math.random() * 0.3],
          scale: 0.8 + Math.random() * 0.4,
          swayPhase: Math.random() * Math.PI * 2,
          freqIndex: Math.floor((f / flowerCount) * (audioData.length - 1))
        });
      }
    }
    return petalArray;
  }, [audioData.length]);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.length) return;
    
    const time = clock.getElapsedTime();
    const windStrength = Math.sin(time * 0.5) * 0.3 + 0.7;
    
    petals.forEach((petal, i) => {
      const child = groupRef.current?.children[i];
      if (!child) return;
      
      const freq = audioData[petal.freqIndex] || 0;
      const bassResponse = freq * audioSensitivity.frequency * 2;
      
      // Wind sway motion with audio response
      const swayX = Math.sin(time * 0.8 + petal.swayPhase) * windStrength * (1 + bassResponse);
      const swayY = Math.cos(time * 0.6 + petal.swayPhase * 0.5) * windStrength * 0.5;
      const swayZ = Math.sin(time * 0.9 + petal.swayPhase * 1.3) * windStrength * 0.7;
      
      // Combine flower center position with local petal offset and sway
      child.position.set(
        petal.flowerCenter[0] + petal.localX + swayX,
        petal.flowerCenter[1] + petal.localZ * 0.2 + swayY + bassResponse * 2,
        petal.flowerCenter[2] + petal.localZ + swayZ
      );
      
      // Rotation with wind and audio influence
      child.rotation.set(
        petal.rotation[0] + Math.sin(time + petal.swayPhase) * 0.3,
        petal.rotation[1] + time * 0.2 + swayX * 0.5,
        petal.rotation[2] + Math.cos(time * 0.7 + petal.swayPhase) * 0.4 + bassResponse * 0.5
      );
      
      // Scale with audio pulsing
      child.scale.setScalar(petal.scale * (1 + bassResponse * 0.4));
    });
  });
  
  const material = createVisualizerMaterial();
  
  return (
    <group ref={groupRef}>
      {petals.map((petal) => (
        <mesh key={petal.id} rotation={petal.rotation}>
          {/* Petal shape - elongated and curved */}
          <group>
            <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
              <boxGeometry args={[0.1, 1.2, 0.02]} />
              <primitive object={material} />
            </mesh>
            <mesh position={[0.15, 0.3, 0]} rotation={[0, 0, -Math.PI / 8]}>
              <boxGeometry args={[0.08, 0.8, 0.02]} />
              <primitive object={material} />
            </mesh>
            <mesh position={[-0.15, 0.3, 0]} rotation={[0, 0, Math.PI / 8]}>
              <boxGeometry args={[0.08, 0.8, 0.02]} />
              <primitive object={material} />
            </mesh>
          </group>
        </mesh>
      ))}
      {/* Flower centers */}
      {Array.from({ length: 20 }, (_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const radius = 8 + Math.sin(i * 0.5) * 4;
        return (
          <mesh
            key={\`center-\${i}\`}
            position={[
              Math.cos(angle) * radius,
              Math.sin(i * 0.3) * 2,
              Math.sin(angle) * radius
            ]}
          >
            <sphereGeometry args={[0.3, 8, 8]} />
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

export default function AppleWithBiteVisualizer({ audioData }: { audioData: number[] }) {
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
              freqIndex: Math.floor(((x + resolution) / (resolution * 2)) * (audioData.length - 1))
            });
          }
        }
      }
    }
    return cubes;
  }, [audioData.length]);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.length) return;
    
    const time = clock.getElapsedTime();
    
    groupRef.current.children.forEach((child, i) => {
      if (i < voxels.length) {
        const voxel = voxels[i];
        const freq = audioData[voxel.freqIndex] || 0;
        
        child.position.y = voxel.y + Math.sin(time + i * 0.1) * 0.1 + freq * audioSensitivity.frequency * 0.5;
        child.scale.setScalar(1 + freq * audioSensitivity.frequency * 0.3);
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

export default function MedievalShieldVisualizer({ audioData }: { audioData: number[] }) {
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
        freqIndex: Math.floor((i / 12) * (audioData.length - 1))
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
          freqIndex: Math.floor(((i + r * 10) / (8 * r + 40)) * (audioData.length - 1))
        });
      }
    }
    return parts;
  }, [audioData.length]);
  
  useFrame(({ clock }) => {
    if (!groupRef.current || !audioData.length) return;
    
    const time = clock.getElapsedTime();
    const avgFreq = audioData.reduce((a, b) => a + b, 0) / audioData.length;
    
    // Rotate entire shield
    groupRef.current.rotation.z = time * 0.1 + avgFreq * audioSensitivity.frequency * 0.5;
    
    groupRef.current.children.forEach((child, i) => {
      if (i < segments.length) {
        const segment = segments[i];
        const freq = audioData[segment.freqIndex] || 0;
        
        if (segment.type === 'segment') {
          child.scale.setScalar(1 + freq * audioSensitivity.frequency * 0.4);
          child.position.z = freq * audioSensitivity.frequency * 1;
        } else {
          child.scale.setScalar(0.8 + freq * audioSensitivity.frequency * 0.3);
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

  try {
    const { prompt, userId } = await req.json();
    
    if (!prompt || !userId) {
      return new Response('Missing required fields', { status: 400 });
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

export default function FallbackVisualizer({ audioData }: { audioData: number[] }) {
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
        fi: Math.floor((i / count) * (audioData.length - 1))
      });
    }
    return arr;
  }, [audioData.length]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const it = items[i];
      if (!it) return;
      const f = audioData[it.fi] || 0;
      const response = f * audioSensitivity.frequency;
      child.rotation.y = it.r + Math.sin(t + i * 0.03) * 0.4;
      child.rotation.x = Math.sin(t * 0.3 + i * 0.02) * (0.3 + response * 0.5);
      child.position.y = it.y + Math.sin(t + i * 0.04) * (0.5 + response * 1.5);
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
