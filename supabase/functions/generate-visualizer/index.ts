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

const VISUALIZER_TEMPLATE = `
// Create a React Three Fiber visualizer component
// Return a plain JavaScript function (no imports, no TypeScript)
// Use React.createElement instead of JSX
// Must follow this EXACT structure:

function {{VISUALIZER_NAME}}(props) {
  const audioData = props.audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const meshRef = React.useRef(null);
  
  // Calculate frequency bands
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
  
  // Animation using useFrame
  ReactThreeFiber.useFrame(function(state) {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      {{ANIMATION_LOGIC}}
    }
  });
  
  // Return React.createElement structure (no JSX!)
  return React.createElement(
    React.Fragment,
    null,
    React.createElement('ambientLight', { intensity: 0.5 }),
    React.createElement('directionalLight', { 
      position: [5, 5, 5], 
      intensity: 1 
    }),
    {{RENDER_LOGIC}}
  );
}

return {{VISUALIZER_NAME}};`;

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
    
    // Build the generation prompt
    let generationPrompt = `You are an expert React Three.js developer who creates audio-reactive visualizers using React.createElement.

Create a visualizer based on: "${prompt}"

GENERATION ID: ${timestamp}-${randomSeed}

CRITICAL REQUIREMENTS:
1. Return ONLY a JavaScript function (no imports, no exports, no TypeScript)
2. Use React.createElement() instead of JSX syntax
3. All materials must use color: '#ffffff' (white only)
4. Use audio reactivity (bass, mids, highs) for animations
5. Include natural idle animations using time (t)
6. Keep geometry at reasonable scale (1-2 units max)
7. Use these available objects: React, ReactThreeFiber, THREE

TEMPLATE STRUCTURE TO FOLLOW:
${VISUALIZER_TEMPLATE}

Replace {{VISUALIZER_NAME}} with a PascalCase component name.
Replace {{ANIMATION_LOGIC}} with animation code using bass, mids, highs, and t.
Replace {{RENDER_LOGIC}} with React.createElement calls for 3D objects.

ANIMATION EXAMPLES:
- meshRef.current.rotation.x = t * 0.5 + bass * 2;
- meshRef.current.rotation.y = t * 0.3 + mids * 3;
- meshRef.current.scale.setScalar(1 + bass * 0.5 + Math.sin(t) * 0.1);

RENDER EXAMPLES:
- React.createElement('mesh', { ref: meshRef }, ...)
- React.createElement('boxGeometry', { args: [1, 1, 1] })
- React.createElement('meshStandardMaterial', { color: '#ffffff' })

Return ONLY the function code that matches the template exactly.`;

    if (referenceImage) {
      generationPrompt += `\n\nReference image provided - analyze the visual style and incorporate similar aesthetics into the 3D visualizer.`;
    }

    if (mixStyles && mixStyles.length > 0) {
      generationPrompt += `\n\nCombine elements from these existing visualizer styles: ${mixStyles.join(', ')}`;
    }

    // Generate visualizer code using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert React Three.js developer who creates stunning audio-reactive visualizers. Always return complete, working code that follows the exact template structure provided.'
          },
          {
            role: 'user',
            content: generationPrompt + '\n\nTemplate to fill in:\n' + VISUALIZER_TEMPLATE
          }
        ],
        max_completion_tokens: 2000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      return new Response(JSON.stringify({ error: 'Failed to generate visualizer code' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const generatedCode = data.choices[0].message.content;
    
    // Clean the generated code
    let cleanedCode = generatedCode
      .replace(/```javascript/g, '')
      .replace(/```js/g, '')
      .replace(/```/g, '')
      .replace(/^[\t ]*import[^;]+;?$/gm, '')
      .replace(/useRef<[^>]+>\(/g, 'useRef(')
      .replace(/useMemo<[^>]+>\(/g, 'useMemo(')
      .replace(/: [A-Za-z0-9_<>,\[\]\|\.\s]+(?=[,)}\r\n])/g, '')
      .replace(/\sas\s+[A-Za-z0-9_<>,\[\]\.\s]+/g, '')
      .trim();

    // Validate the generated code has required components
    if (!cleanedCode || !cleanedCode.includes('function') || !cleanedCode.includes('return')) {
      // Return a fallback visualizer if generation fails
      const fallbackName = `FallbackVisualizer${timestamp}`;
      cleanedCode = `
        function ${fallbackName}(props) {
          const meshRef = React.useRef(null);
          
          ReactThreeFiber.useFrame(function(state) {
            if (meshRef.current) {
              const t = state.clock.getElapsedTime();
              meshRef.current.rotation.x = t * 0.5;
              meshRef.current.rotation.y = t * 0.3;
              meshRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.1);
            }
          });
          
          return React.createElement(
            React.Fragment,
            null,
            React.createElement('ambientLight', { intensity: 0.5 }),
            React.createElement('directionalLight', { position: [5, 5, 5], intensity: 1 }),
            React.createElement('mesh', { ref: meshRef },
              React.createElement('boxGeometry', { args: [1, 1, 1] }),
              React.createElement('meshStandardMaterial', { 
                color: '#ffffff',
                metalness: 0.3,
                roughness: 0.7
              })
            )
          );
        }
        
        return ${fallbackName};
      `;
    }
    
    // Wrap in a function that returns the component
    const wrappedCode = `
      return (function() {
        ${cleanedCode}
      })();
    `;
    
    // Extract visualizer name from the cleaned code
    const nameMatch = cleanedCode.match(/function (\w+)/);
    const visualizerName = nameMatch ? nameMatch[1] : 'CustomVisualizer';
    
    // Generate a preview emoji based on the prompt
    const emojiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          {
            role: 'user',
            content: `Generate a single emoji that best represents this visualizer: "${prompt}". Reply with only the emoji, no other text.`
          }
        ],
        max_completion_tokens: 10,
      }),
    });

    const emojiData = await emojiResponse.json();
    const previewEmoji = emojiData.choices?.[0]?.message?.content?.trim() || '✨';

    // Store the generated visualizer in the database
    const { data: savedVisualizer, error: saveError } = await supabase
      .from('custom_visualizers')
      .insert({
        user_id: userId,
        name: visualizerName,
        description: prompt,
        prompt: prompt,
        jsx_code: wrappedCode,
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
      code: wrappedCode
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