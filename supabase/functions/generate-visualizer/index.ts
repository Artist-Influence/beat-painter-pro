
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Enhanced semantic prompt processing with GPT-4
async function enhancePrompt(originalPrompt: string, referenceImage?: string): Promise<{
  enhancedPrompt: string;
  complexity: 'simple' | 'complex';
  category: string;
  objectCount: number;
  semanticBreakdown: string[];
  geometryType: string;
}> {
  if (!openAIApiKey) {
    return {
      enhancedPrompt: originalPrompt,
      complexity: 'simple',
      category: 'unknown',
      objectCount: 1,
      semanticBreakdown: [originalPrompt],
      geometryType: 'sphere'
    };
  }

  try {
    let systemPrompt = `You are an expert 3D visualizer designer who creates detailed, semantically accurate audio-reactive visualizations.

CRITICAL MISSION: Transform simple prompts into precise, multi-component object descriptions that match real-world semantics.

SEMANTIC ACCURACY RULES:
- "airplane" → wings (rectangular), fuselage (cylindrical), tail (triangular), propeller (rotating discs) - NOT generic spheres
- "flower field" → individual flowers with stems (cylinders), petals (cones), centers (spheres), leaves (planes)
- "city" → buildings (boxes) of varying heights, windows (smaller boxes), streets (planes), cars (elongated boxes)
- "forest" → tree trunks (cylinders), branches (smaller cylinders), leaves (small spheres/planes), ground cover

COMPONENT BREAKDOWN REQUIREMENTS:
1. Identify MAIN object type and break into logical components
2. Specify geometry for each component (box, sphere, cylinder, cone, plane, torus)  
3. Define 50-300+ individual elements with realistic proportions
4. Create hierarchical relationships (wings belong to airplane body)
5. Assign unique audio frequency mapping to each component
6. Keep all elements centered within 3-unit radius sphere

MOVEMENT SEMANTICS:
- Airplanes: bank, roll, pitch motions
- Flowers: petal opening/closing, stem swaying
- Buildings: window brightness pulsing, structural sway
- Trees: branch swaying, leaf rustling

OUTPUT FORMAT - JSON:
{
  "enhancedPrompt": "detailed multi-component description with exact geometry specifications",
  "complexity": "simple" | "complex",
  "category": "vehicles" | "nature" | "architecture" | "abstract" | "space" | "organic",
  "objectCount": number_of_total_elements,
  "semanticBreakdown": ["component1", "component2", "component3"],
  "geometryType": "multi-component"
}

EXAMPLES:
airplane → {
  "enhancedPrompt": "Fleet of 75 realistic airplanes, each with rectangular wings (boxGeometry), cylindrical fuselage (cylinderGeometry), triangular tail fins (coneGeometry), rotating propellers (torusGeometry). Individual banking, rolling, and altitude movements. Audio-reactive: bass controls altitude, mids control banking angle, highs control propeller speed.",
  "semanticBreakdown": ["fuselage", "left-wing", "right-wing", "tail", "propeller"],
  "geometryType": "multi-component"
}

flower field → {
  "enhancedPrompt": "Garden of 200 individual flowers with cylindrical stems, cone-shaped petals (5-8 per flower), spherical centers, plane-geometry leaves. Each flower sways independently, petals open/close based on audio intensity.",
  "semanticBreakdown": ["stem", "petals", "center", "leaves"],
  "geometryType": "multi-component"
}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: referenceImage 
          ? `Enhance this prompt with reference to the provided image: "${originalPrompt}"`
          : `Enhance this prompt: "${originalPrompt}"`
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages,
        max_completion_tokens: 1200,
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.choices?.[0]?.message?.content) {
      try {
        const result = JSON.parse(data.choices[0].message.content);
        return {
          enhancedPrompt: result.enhancedPrompt || originalPrompt,
          complexity: result.complexity || 'complex',
          category: result.category || 'unknown',
          objectCount: result.objectCount || 100,
          semanticBreakdown: result.semanticBreakdown || [originalPrompt],
          geometryType: result.geometryType || 'multi-component'
        };
      } catch (e) {
        console.log('Failed to parse GPT response, using fallback');
      }
    }
  } catch (error) {
    console.error('Prompt enhancement failed:', error);
  }

  // Fallback enhancement
  return {
    enhancedPrompt: originalPrompt,
    complexity: originalPrompt.length > 20 ? 'complex' : 'simple',
    category: 'unknown',
    objectCount: 50,
    semanticBreakdown: [originalPrompt],
    geometryType: 'sphere'
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get geometry type from prompt
function getGeometryType(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('sphere') || lower.includes('ball') || lower.includes('orb')) return 'sphereGeometry';
  if (lower.includes('cube') || lower.includes('box')) return 'boxGeometry';
  if (lower.includes('cylinder') || lower.includes('tube')) return 'cylinderGeometry';
  if (lower.includes('cone') || lower.includes('pyramid')) return 'coneGeometry';
  if (lower.includes('torus') || lower.includes('donut') || lower.includes('ring')) return 'torusGeometry';
  if (lower.includes('plane') || lower.includes('flat')) return 'planeGeometry';
  return 'icosahedronGeometry'; // Default to interesting shape
}

// Helper function to get geometry args
function getGeometryArgs(prompt: string): string {
  const geometryType = getGeometryType(prompt);
  switch(geometryType) {
    case 'sphereGeometry': return '[1, 32, 32]';
    case 'boxGeometry': return '[1, 1, 1]';
    case 'cylinderGeometry': return '[0.5, 0.5, 1, 32]';
    case 'coneGeometry': return '[0.5, 1, 32]';
    case 'torusGeometry': return '[1, 0.3, 16, 100]';
    case 'planeGeometry': return '[2, 2, 32, 32]';
    case 'icosahedronGeometry': return '[1, 1]';
    default: return '[1, 1, 1]';
  }
}

/**
 * Detect prompts that should produce many objects / complex arrangements.
 */
function isComplexPrompt(prompt: string): boolean {
  const p = prompt.toLowerCase();
  return [
    'field', 'fields', 'garden', 'flowers', 'flower', 'blossom', 'petal',
    'swarm', 'flock', 'school', 'cloud', 'grid', 'matrix', 'lattice',
    'stars', 'rain', 'snow', 'particles', 'many', 'multiple', 'array'
  ].some(k => p.includes(k));
}

// We'll inline the semantic templates due to Deno import limitations

/**
 * Generate semantically accurate visualizer using GPT analysis
 */
function getSemanticVisualizer(prompt: string, analysis: {
  category: string;
  semanticBreakdown: string[];
  objectCount: number;
  enhancedPrompt: string;
  geometryType: string;
}): string {
  // Use airplane template for aircraft prompts
  if (analysis.category === 'vehicles' || prompt.toLowerCase().includes('airplane') || prompt.toLowerCase().includes('plane')) {
    return getAirplaneFleetTemplate(analysis.objectCount, analysis.enhancedPrompt);
  }
  
  // Use flower template for nature prompts
  if (analysis.category === 'nature' || prompt.toLowerCase().includes('flower')) {
    return getFlowerFieldTemplate(analysis.objectCount, analysis.enhancedPrompt);
  }
  
  // Default to enhanced multi-object template
  return getEnhancedDefaultVisualizer(prompt);
}

function getAirplaneFleetTemplate(count: number, description: string): string {
  const fleetSize = Math.min(Math.max(count, 50), 150);
  return `return function CustomVisualizer(props) {
  const { audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 } } = props;
  const groupRef = React.useRef(null);
  
  const audioAnalysis = React.useMemo(() => {
    const freq = audioData.frequency || Array(256).fill(0);
    const bass = Math.min(freq.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255, 1);
    const mids = Math.min(freq.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255, 1);
    const highs = Math.min(freq.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255, 1);
    return { bass, mids, highs, beat: audioData.beatStrength || 0 };
  }, [audioData]);

  const airplaneData = React.useMemo(() => {
    const airplanes = [];
    let seed = ${Math.floor(Math.random() * 99999)};
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    
    for (let i = 0; i < ${fleetSize}; i++) {
      const radius = 1.5 + rnd() * 1.0;
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(2 * rnd() - 1);
      
      airplanes.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.cos(phi),
        z: radius * Math.sin(phi) * Math.sin(theta),
        scale: 0.08 + rnd() * 0.04,
        bankAngle: (rnd() - 0.5) * 0.5,
        audioIndex: i % 64
      });
    }
    return airplanes;
  }, []);

  ReactThreeFiber.useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * (0.05 + audioAnalysis.mids * 0.2);
      groupRef.current.position.y = audioAnalysis.bass * 0.3;
    }
  });

  const airplanes = airplaneData.map((plane, i) => {
    const freqBin = Math.floor((plane.audioIndex / 64) * 255);
    const localIntensity = audioData.frequency ? (audioData.frequency[freqBin] || 0) / 255 : 0;
    
    return React.createElement('group', {
      key: i,
      position: [plane.x, plane.y + audioAnalysis.bass * 0.4, plane.z],
      rotation: [plane.bankAngle + audioAnalysis.mids * 0.4, 0, 0],
      scale: [plane.scale * (1 + localIntensity * 0.3), plane.scale * (1 + localIntensity * 0.3), plane.scale * (1 + localIntensity * 0.3)]
    },
      React.createElement('mesh', { position: [0, 0, 0] },
        React.createElement('cylinderGeometry', { args: [0.3, 0.4, 2.5, 8] }),
        React.createElement('meshStandardMaterial', { color: '#ffffff', emissiveIntensity: 0.03 + localIntensity * 0.1 })
      ),
      React.createElement('mesh', { position: [-1.2, 0, 0.3] },
        React.createElement('boxGeometry', { args: [2, 0.1, 0.8] }),
        React.createElement('meshStandardMaterial', { color: '#ffffff', emissiveIntensity: 0.02 + audioAnalysis.mids * 0.08 })
      ),
      React.createElement('mesh', { position: [1.2, 0, 0.3] },
        React.createElement('boxGeometry', { args: [2, 0.1, 0.8] }),
        React.createElement('meshStandardMaterial', { color: '#ffffff', emissiveIntensity: 0.02 + audioAnalysis.mids * 0.08 })
      )
    );
  });

  return React.createElement('group', { ref: groupRef },
    React.createElement('ambientLight', { intensity: 0.3 }),
    React.createElement('directionalLight', { position: [10, 10, 5], intensity: 0.7 }),
    ...airplanes
  );
};`;
}

function getFlowerFieldTemplate(count: number, description: string): string {
  const flowerCount = Math.min(Math.max(count, 80), 200);
  return `return function CustomVisualizer(props) {
  const { audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 } } = props;
  const groupRef = React.useRef(null);
  
  const audioAnalysis = React.useMemo(() => {
    const freq = audioData.frequency || Array(256).fill(0);
    const bass = Math.min(freq.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255, 1);
    const mids = Math.min(freq.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255, 1);
    const highs = Math.min(freq.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255, 1);
    return { bass, mids, highs, beat: audioData.beatStrength || 0 };
  }, [audioData]);

  const flowerData = React.useMemo(() => {
    const flowers = [];
    let seed = ${Math.floor(Math.random() * 99999)};
    function rnd() { seed = (seed * 1103515245 + 12345) % 4294967296; return seed / 4294967296; }
    
    const gridSize = Math.ceil(Math.sqrt(${flowerCount}));
    const spacing = 0.35;
    
    for (let i = 0; i < ${flowerCount}; i++) {
      const gx = i % gridSize;
      const gz = Math.floor(i / gridSize);
      const x = (gx - gridSize / 2) * spacing + (rnd() - 0.5) * 0.2;
      const z = (gz - gridSize / 2) * spacing + (rnd() - 0.5) * 0.2;
      
      flowers.push({
        x, z,
        stemHeight: 0.4 + rnd() * 0.5,
        petalCount: 5 + Math.floor(rnd() * 4),
        petalLength: 0.08 + rnd() * 0.04,
        centerSize: 0.02 + rnd() * 0.01,
        audioIndex: i % 32
      });
    }
    return flowers;
  }, []);

  ReactThreeFiber.useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current && audioAnalysis.bass + audioAnalysis.mids + audioAnalysis.highs < 0.01) {
      groupRef.current.rotation.y = Math.sin(t * 0.1) * 0.05;
    }
  });

  const flowers = flowerData.map((flower, i) => {
    const freqBin = Math.floor((flower.audioIndex / 32) * 255);
    const localIntensity = audioData.frequency ? (audioData.frequency[freqBin] || 0) / 255 : 0;
    
    return React.createElement('group', {
      key: i,
      position: [flower.x, 0, flower.z],
      rotation: [localIntensity * 0.2, 0, 0]
    },
      React.createElement('mesh', { 
        position: [0, flower.stemHeight / 2, 0],
        scale: [1, 1 + audioAnalysis.bass * 0.3, 1]
      },
        React.createElement('cylinderGeometry', { args: [0.01, 0.008, flower.stemHeight, 6] }),
        React.createElement('meshStandardMaterial', { color: '#ffffff', emissiveIntensity: 0.02 + localIntensity * 0.06 })
      ),
      React.createElement('mesh', { 
        position: [0, flower.stemHeight, 0],
        scale: [1 + audioAnalysis.beat * 0.4, 1 + audioAnalysis.beat * 0.4, 1 + audioAnalysis.beat * 0.4]
      },
        React.createElement('sphereGeometry', { args: [flower.centerSize, 8, 8] }),
        React.createElement('meshStandardMaterial', { color: '#ffffff', emissiveIntensity: 0.1 + audioAnalysis.highs * 0.3 })
      ),
      ...Array(flower.petalCount).fill(null).map((_, k) => {
        const angle = (k / flower.petalCount) * Math.PI * 2;
        const petalDistance = flower.petalLength * (0.7 + localIntensity * 0.3);
        
        return React.createElement('mesh', {
          key: 'petal' + k,
          position: [
            Math.cos(angle) * petalDistance,
            flower.stemHeight,
            Math.sin(angle) * petalDistance
          ],
          rotation: [-Math.PI/2, angle, 0],
          scale: [1 + audioAnalysis.beat * 0.5, 1 + audioAnalysis.beat * 0.5, 1]
        },
          React.createElement('coneGeometry', { args: [flower.petalLength * 0.6, 0.12, 6] }),
          React.createElement('meshStandardMaterial', { color: '#ffffff', emissiveIntensity: 0.04 + audioAnalysis.mids * 0.15 })
        );
      })
    );
  });

  return React.createElement('group', { ref: groupRef },
    React.createElement('ambientLight', { intensity: 0.4 }),
    React.createElement('directionalLight', { position: [5, 8, 3], intensity: 0.8 }),
    ...flowers
  );
};`;
}


// Enhanced default visualizer with better audio reactivity and idle behavior
function getEnhancedDefaultVisualizer(prompt: string): string {
  const geometryType = getGeometryType(prompt);
  const geometryArgs = getGeometryArgs(prompt);
  
  return `return function CustomVisualizer(props) {
    const { audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 } } = props;
    const meshRef = React.useRef(null);
    const groupRef = React.useRef(null);
    const orbitRef = React.useRef(null);
    
    // Enhanced audio analysis
    const audioAnalysis = React.useMemo(() => {
      const freq = audioData.frequency || Array(256).fill(0);
      const bass = Math.min(freq.slice(0, 85).reduce((a, b) => a + b, 0) / 85 / 255, 1);
      const mids = Math.min(freq.slice(86, 170).reduce((a, b) => a + b, 0) / 84 / 255, 1);
      const highs = Math.min(freq.slice(171, 255).reduce((a, b) => a + b, 0) / 84 / 255, 1);
      return { bass, mids, highs, beat: audioData.beatStrength, hasAudio: bass + mids + highs > 0.01 };
    }, [audioData]);
    
    // Advanced animation with idle behavior
    ReactThreeFiber.useFrame((state) => {
      const t = state.clock.getElapsedTime();
      
      if (meshRef.current) {
        if (!audioAnalysis.hasAudio) {
          // Elegant idle animation
          meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.2;
          meshRef.current.rotation.y = t * 0.1;
          meshRef.current.scale.setScalar(1 + Math.sin(t * 0.5) * 0.1);
        } else {
          // Full audio reactivity
          meshRef.current.rotation.x = t * (0.2 + audioAnalysis.bass * 0.8) + audioAnalysis.bass * 2;
          meshRef.current.rotation.y = t * (0.15 + audioAnalysis.mids * 0.6) + audioAnalysis.mids * 3;
          meshRef.current.rotation.z = audioAnalysis.highs * 1.5;
          meshRef.current.scale.setScalar(1 + audioAnalysis.beat * 0.4 + audioAnalysis.bass * 0.3);
        }
      }
      
      if (groupRef.current) {
        if (!audioAnalysis.hasAudio) {
          groupRef.current.rotation.z = Math.sin(t * 0.2) * 0.05;
          groupRef.current.position.y = Math.sin(t * 0.4) * 0.03;
        } else {
          groupRef.current.rotation.z = audioAnalysis.mids * 0.3;
          groupRef.current.position.y = audioAnalysis.bass * 0.2;
        }
      }
      
      if (orbitRef.current) {
        orbitRef.current.rotation.x = t * (0.1 + audioAnalysis.highs * 0.2);
        orbitRef.current.rotation.y = t * (0.08 + audioAnalysis.mids * 0.15);
      }
    });
    
    // Create orbital elements for added complexity
    const orbitalElements = Array(8).fill(null).map((_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 1.2 + Math.sin(angle * 3) * 0.3;
      return React.createElement('mesh', {
        key: 'orbit' + i,
        position: [Math.cos(angle) * radius, Math.sin(angle * 2) * 0.2, Math.sin(angle) * radius],
        scale: [0.08 + audioAnalysis.highs * 0.1, 0.08 + audioAnalysis.highs * 0.1, 0.08 + audioAnalysis.highs * 0.1]
      },
        React.createElement('sphereGeometry', { args: [1, 8, 8] }),
        React.createElement('meshStandardMaterial', {
          color: '#ffffff',
          metalness: 0.7,
          roughness: 0.2,
          emissive: '#ffffff',
          emissiveIntensity: 0.1 + audioAnalysis.highs * 0.3,
          transparent: true,
          opacity: 0.6 + audioAnalysis.beat * 0.4
        })
      );
    });
    
    return React.createElement('group', { ref: groupRef },
      React.createElement('ambientLight', { intensity: 0.4 }),
      React.createElement('directionalLight', { position: [5, 5, 5], intensity: 0.8 }),
      React.createElement('pointLight', { 
        position: [0, 0, 0], 
        intensity: 0.6 + audioAnalysis.beat * 1.2,
        color: '#ffffff'
      }),
      
      // Main mesh
      React.createElement('mesh', { ref: meshRef },
        React.createElement('${geometryType}', { args: ${geometryArgs} }),
        React.createElement('meshStandardMaterial', { 
          color: '#ffffff',
          metalness: 0.4,
          roughness: 0.6,
          emissive: '#ffffff',
          emissiveIntensity: 0.08 + audioAnalysis.beat * 0.2
        })
      ),
      
      // Orbital elements
      React.createElement('group', { ref: orbitRef }, ...orbitalElements)
    );
  };`;
}

// Working default visualizer (kept but ensure white materials)
function getDefaultVisualizer(prompt: string): string {
  const geometryType = getGeometryType(prompt);
  const geometryArgs = getGeometryArgs(prompt);
  
  return `return function CustomVisualizer(props) {
    const audioData = props.audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
    const meshRef = React.useRef(null);
    const groupRef = React.useRef(null);
    
    const frequency = audioData.frequency || Array(256).fill(0);
    
    const bass = React.useMemo(() => {
      let sum = 0;
      for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
      return Math.min(sum / 86 / 255, 1.0);
    }, [frequency]);
    
    const mids = React.useMemo(() => {
      let sum = 0;
      for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
      return Math.min(sum / 85 / 255, 1.0);
    }, [frequency]);
    
    const highs = React.useMemo(() => {
      let sum = 0;
      for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
      return Math.min(sum / 85 / 255, 1.0);
    }, [frequency]);
    
    ReactThreeFiber.useFrame((state) => {
      if (meshRef.current) {
        const t = state.clock.getElapsedTime();
        meshRef.current.rotation.x = t * 0.5 + bass * 2;
        meshRef.current.rotation.y = t * 0.3 + mids * 3;
        meshRef.current.scale.setScalar(1 + bass * 0.5);
      }
      if (groupRef.current) {
        groupRef.current.rotation.z = state.clock.getElapsedTime() * 0.1;
      }
    });
    
    return React.createElement(
      'group',
      { ref: groupRef },
      React.createElement('ambientLight', { intensity: 0.5 }),
      React.createElement('directionalLight', { position: [5, 5, 5], intensity: 1 }),
      React.createElement('mesh', { ref: meshRef },
        React.createElement('${geometryType}', { args: ${geometryArgs} }),
        React.createElement('meshStandardMaterial', { 
          color: '#ffffff',
          metalness: 0.3,
          roughness: 0.7,
          emissive: '#ffffff',
          emissiveIntensity: 0.1
        })
      )
    );
  };`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, referenceImage, mixStyles, userId } = await req.json();
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check quota before generating
    const { data: quotaCheck } = await supabase.rpc('check_visualizer_quota', { 
      _user_id: userId 
    });

    if (!quotaCheck) {
      return new Response(JSON.stringify({ error: 'Quota exceeded. You can create up to 5 custom visualizers. Delete some to create new ones.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // STEP 1: Enhance the prompt with GPT for semantic analysis
    console.log('[generator] Original prompt:', prompt);
    const enhancement = await enhancePrompt(prompt, referenceImage);
    console.log('[generator] Enhanced prompt:', enhancement.enhancedPrompt);
    console.log('[generator] Category:', enhancement.category, 'Objects:', enhancement.objectCount);
    console.log('[generator] Semantic breakdown:', enhancement.semanticBreakdown);

    // STEP 2: Generate semantically accurate visualizer
    let cleanedCode = getSemanticVisualizer(prompt, enhancement);
    console.log('[generator] Using semantic template generation');
    
    // Clean up the code to ensure proper formatting
    if (!cleanedCode || !cleanedCode.includes('return function')) {
      console.log('Fallback to enhanced default visualizer');
      cleanedCode = getEnhancedDefaultVisualizer(prompt);
    } else if (openAIApiKey) {
      try {
        // Use a VERY specific prompt that produces working code
        const systemPrompt = `Generate a React Three Fiber visualizer function.
Output ONLY this exact code structure, modifying ONLY the geometry type and animation values:

return function CustomVisualizer(props) {
  const audioData = props.audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const meshRef = React.useRef(null);
  const groupRef = React.useRef(null);
  
  const frequency = audioData.frequency || Array(256).fill(0);
  
  const bass = React.useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return Math.min(sum / 86 / 255, 1.0);
  }, [frequency]);
  
  const mids = React.useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
    return Math.min(sum / 85 / 255, 1.0);
  }, [frequency]);
  
  const highs = React.useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
    return Math.min(sum / 85 / 255, 1.0);
  }, [frequency]);
  
  ReactThreeFiber.useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      meshRef.current.rotation.x = t * 0.5 + bass * 2;
      meshRef.current.rotation.y = t * 0.3 + mids * 3;
      meshRef.current.scale.setScalar(1 + bass * 0.5);
    }
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.getElapsedTime() * 0.1;
    }
  });
  
  return React.createElement(
    'group',
    { ref: groupRef },
    React.createElement('ambientLight', { intensity: 0.5 }),
    React.createElement('directionalLight', { position: [5, 5, 5], intensity: 1 }),
    React.createElement('mesh', { ref: meshRef },
      React.createElement('${getGeometryType(prompt)}', { args: ${getGeometryArgs(prompt)} }),
      React.createElement('meshStandardMaterial', { 
        color: '#ffffff',
        metalness: 0.3,
        roughness: 0.7,
        emissive: '#ffffff',
        emissiveIntensity: 0.1
      })
    )
  );
};

The user wants: ${prompt}
Modify ONLY the geometry type (boxGeometry, sphereGeometry, etc.) and rotation speeds.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4.1-2025-04-14',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: 'Generate the code exactly as shown, choosing appropriate geometry.' }
            ],
            max_completion_tokens: 1500,
          }),
        });

        const data = await response.json();
        
        if (response.ok && data.choices?.[0]?.message?.content) {
          cleanedCode = data.choices[0].message.content
            .replace(/```javascript/g, '')
            .replace(/```js/g, '')
            .replace(/```/g, '')
            .trim();
        }
      } catch (error) {
        console.error('OpenAI generation failed:', error);
      }
    }
    
    // If OpenAI failed or no API key, or we still don't have code, use default logic
    if (!cleanedCode || !cleanedCode.includes('return function') || !cleanedCode.includes('React.createElement')) {
      const usedDefault = isComplexPrompt(prompt) ? '[advanced-local]' : '[enhanced-default]';
      console.log('Using fallback visualizer for prompt:', prompt, usedDefault);
      cleanedCode = getEnhancedDefaultVisualizer(prompt);
    }
    
    // Extract visualizer name from the cleaned code
    const nameMatch = cleanedCode.match(/function (\w+)/);
    const visualizerName = nameMatch ? nameMatch[1] : 'CustomVisualizer';
    
    // Generate a simple emoji based on geometry type or complex template
    let previewEmoji = '✨';
    if (prompt.toLowerCase().match(/flower|flowers|blossom|petal|garden|field/)) previewEmoji = '🌸';
    else if (prompt.toLowerCase().match(/swarm|cloud|particles|stars|rain|snow/)) previewEmoji = '🫧';
    else if (prompt.toLowerCase().match(/grid|matrix|lattice/)) previewEmoji = '🔲';
    else {
      const geometryType = getGeometryType(prompt);
      switch(geometryType) {
        case 'sphereGeometry': previewEmoji = '🔮'; break;
        case 'boxGeometry': previewEmoji = '📦'; break;
        case 'cylinderGeometry': previewEmoji = '🥫'; break;
        case 'coneGeometry': previewEmoji = '🔺'; break;
        case 'torusGeometry': previewEmoji = '🍩'; break;
        case 'planeGeometry': previewEmoji = '🟫'; break;
        case 'icosahedronGeometry': previewEmoji = '💎'; break;
      }
    }

    // Store the generated visualizer in the database
    const { data: savedVisualizer, error: saveError } = await supabase
      .from('custom_visualizers')
      .insert({
        user_id: userId,
        name: visualizerName,
        description: prompt,
        prompt: prompt,
        jsx_code: cleanedCode,
        scale_factor: isComplexPrompt(prompt) ? 0.35 : 0.25,
        preview_emoji: previewEmoji,
        is_public: false
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving visualizer:', saveError);
      return new Response(JSON.stringify({ error: 'Failed to save visualizer' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      visualizer: savedVisualizer,
      code: cleanedCode
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-visualizer function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
