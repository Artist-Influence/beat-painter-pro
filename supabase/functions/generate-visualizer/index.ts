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

// Working default visualizer
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

    // Add randomness for unique generation
    const timestamp = Date.now();
    const randomSeed = Math.random().toString(36).substring(7);
    
    // Use simplified prompt-based generation with fallback to default
    let cleanedCode = '';
    
    if (openAIApiKey) {
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
    
    // If OpenAI failed or no API key, use default visualizer
    if (!cleanedCode || !cleanedCode.includes('return function') || !cleanedCode.includes('React.createElement')) {
      console.log('Using default visualizer for prompt:', prompt);
      cleanedCode = getDefaultVisualizer(prompt);
    }
    
    // Extract visualizer name from the cleaned code
    const nameMatch = cleanedCode.match(/function (\w+)/);
    const visualizerName = nameMatch ? nameMatch[1] : 'CustomVisualizer';
    
    // Generate a simple emoji based on geometry type
    let previewEmoji = '✨';
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

    // Store the generated visualizer in the database
    const { data: savedVisualizer, error: saveError } = await supabase
      .from('custom_visualizers')
      .insert({
        user_id: userId,
        name: visualizerName,
        description: prompt,
        prompt: prompt,
        jsx_code: cleanedCode,
        scale_factor: 0.25,
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