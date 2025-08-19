
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

/**
 * Complex visualizer templates
 * - All materials are white so external style/texture mapping can colorize uniformly.
 */
function getComplexVisualizer(prompt: string): string {
  const p = prompt.toLowerCase();

  // 1) Flower field (dense arrangement of small flower groups swaying with audio)
  if (p.includes('flower') || p.includes('flowers') || p.includes('blossom') || p.includes('petal') || p.includes('garden') || p.includes('field')) {
    return `return function CustomVisualizer(props) {
  const audioData = props.audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
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

  // Deterministic layout based on prompt length for stability
  const count = 180;
  const positions = React.useMemo(() => {
    const arr = [];
    let seed = ${Math.floor(Math.random() * 99999)};
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    const grid = Math.ceil(Math.sqrt(count));
    const spacing = 0.35;
    for (let i = 0; i < count; i++) {
      const gx = i % grid;
      const gz = Math.floor(i / grid);
      const jitterX = (rnd() - 0.5) * 0.2;
      const jitterZ = (rnd() - 0.5) * 0.2;
      const x = (gx - grid / 2) * spacing + jitterX;
      const z = (gz - grid / 2) * spacing + jitterZ;
      const phase = rnd() * Math.PI * 2;
      arr.push({ x, z, phase });
    }
    return arr;
  }, []);

  ReactThreeFiber.useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      groupRef.current.rotation.y = Math.sin(t * 0.05) * 0.1; // subtle scene drift
    }
  });

  const flowers = positions.map((pos, i) => {
    // Sway each flower slightly with mids; bloom pulsates with bass/highs
    const sway = 0.15; // max radians
    return React.createElement('group', {
      key: i,
      position: [pos.x, 0, pos.z],
      rotation: [0, 0, 0],
    },
      // stem
      React.createElement('mesh', { position: [0, 0.25, 0], rotation: [0, 0, 0] },
        React.createElement('cylinderGeometry', { args: [0.01, 0.01, 0.5, 6] }),
        React.createElement('meshStandardMaterial', {
          color: '#ffffff',
          metalness: 0.2,
          roughness: 0.85,
          emissive: '#ffffff',
          emissiveIntensity: 0.05 + bass * 0.1
        })
      ),
      // center
      React.createElement('mesh', { position: [0, 0.52, 0] },
        React.createElement('sphereGeometry', { args: [0.03, 12, 12] }),
        React.createElement('meshStandardMaterial', {
          color: '#ffffff',
          metalness: 0.3,
          roughness: 0.7,
          emissive: '#ffffff',
          emissiveIntensity: 0.08 + highs * 0.2
        })
      ),
      // petals (5)
      ...[0,1,2,3,4].map((k) =>
        React.createElement('mesh', {
          key: 'p' + k,
          position: [
            Math.cos((k/5)*Math.PI*2) * 0.07,
            0.52,
            Math.sin((k/5)*Math.PI*2) * 0.07
          ],
          rotation: [ -Math.PI/2 + 0.15 * mids, (k/5)*Math.PI*2, 0 ],
          scale: [1 + bass * 0.2, 1 + bass * 0.2, 1]
        },
          React.createElement('coneGeometry', { args: [0.03, 0.08, 10] }),
          React.createElement('meshStandardMaterial', {
            color: '#ffffff',
            metalness: 0.25,
            roughness: 0.65,
            emissive: '#ffffff',
            emissiveIntensity: 0.05 + mids * 0.15
          })
        )
      )
    );
  });

  return React.createElement(
    'group',
    { ref: groupRef },
    React.createElement('ambientLight', { intensity: 0.55 }),
    React.createElement('directionalLight', { position: [5, 5, 5], intensity: 1 }),
    ...flowers
  );
};`;
  }

  // 2) Swarm of orbs (instanced-like via many meshes), good for "swarm/cloud/particles"
  if (p.includes('swarm') || p.includes('cloud') || p.includes('particles') || p.includes('stars') || p.includes('rain') || p.includes('snow') || p.includes('many') || p.includes('multiple')) {
    return `return function CustomVisualizer(props) {
  const audioData = props.audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
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

  const count = 240;
  const particles = React.useMemo(() => {
    const arr = [];
    let seed = ${Math.floor(Math.random() * 99999)};
    function rnd() { seed = (seed * 1103515245 + 12345) % 4294967296; return seed / 4294967296; }
    for (let i = 0; i < count; i++) {
      const r = 1.5 + rnd() * 1.0;
      const a = rnd() * Math.PI * 2;
      const h = (rnd() - 0.5) * 1.5;
      const size = 0.02 + rnd() * 0.06;
      arr.push({ r, a, h, size, speed: 0.1 + rnd() * 0.4 });
    }
    return arr;
  }, []);

  ReactThreeFiber.useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      groupRef.current.rotation.y = t * 0.05 * (0.5 + highs);
    }
  });

  const nodes = particles.map((p, i) => {
    return React.createElement('mesh', {
      key: i,
      position: [Math.cos(p.a) * p.r, p.h + Math.sin(p.a * 2) * 0.2 * bass, Math.sin(p.a) * p.r],
      scale: [p.size * (1 + bass), p.size * (1 + bass), p.size * (1 + bass)],
      rotation: [p.a, 0, 0]
    },
      React.createElement('sphereGeometry', { args: [8 * p.size + 6, 12, 12] }),
      React.createElement('meshStandardMaterial', {
        color: '#ffffff',
        metalness: 0.2,
        roughness: 0.6,
        emissive: '#ffffff',
        emissiveIntensity: 0.07 + mids * 0.2
      })
    );
  });

  return React.createElement(
    'group',
    { ref: groupRef },
    React.createElement('ambientLight', { intensity: 0.5 }),
    React.createElement('directionalLight', { position: [5, 5, 5], intensity: 1 }),
    ...nodes
  );
};`;
  }

  // 3) Grid lattice of shapes
  if (p.includes('grid') || p.includes('matrix') || p.includes('lattice')) {
    return `return function CustomVisualizer(props) {
  const audioData = props.audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
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

  const N = 12;
  const spacing = 0.25;

  const cells = [];
  for (let x = -N/2; x < N/2; x++) {
    for (let y = -N/2; y < N/2; y++) {
      for (let z = -N/2; z < N/2; z++) {
        if ((Math.abs(x) + Math.abs(y) + Math.abs(z)) % 3 === 0) {
          cells.push([x * spacing, y * spacing, z * spacing]);
        }
      }
    }
  }

  ReactThreeFiber.useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      groupRef.current.rotation.x = t * 0.08;
      groupRef.current.rotation.y = t * 0.06;
    }
  });

  const nodes = cells.map((pos, i) => React.createElement('mesh', { key: i, position: pos, scale: [0.07 + 0.05 * bass, 0.07 + 0.05 * bass, 0.07 + 0.05 * bass] },
    React.createElement('boxGeometry', { args: [1, 1, 1] }),
    React.createElement('meshStandardMaterial', {
      color: '#ffffff',
      metalness: 0.25,
      roughness: 0.7,
      emissive: '#ffffff',
      emissiveIntensity: 0.05 + highs * 0.2
    })
  ));

  return React.createElement(
    'group',
    { ref: groupRef },
    React.createElement('ambientLight', { intensity: 0.5 }),
    React.createElement('directionalLight', { position: [5, 5, 5], intensity: 1 }),
    ...nodes
  );
};`;
  }

  // fallback to default single object template when complex set didn't trigger
  return getDefaultVisualizer(prompt);
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

    // Prefer complex template if prompt indicates plurality/fields/swarms
    let cleanedCode = '';
    if (isComplexPrompt(prompt)) {
      cleanedCode = getComplexVisualizer(prompt);
      console.log('[generator] Using complex template for prompt:', prompt);
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
      const usedDefault = isComplexPrompt(prompt) ? '[complex-local]' : '[simple-default]';
      console.log('Using fallback visualizer for prompt:', prompt, usedDefault);
      cleanedCode = isComplexPrompt(prompt) ? getComplexVisualizer(prompt) : getDefaultVisualizer(prompt);
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
