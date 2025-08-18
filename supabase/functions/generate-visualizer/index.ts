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

const VISUALIZER_TEMPLATE = `import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { VisualizerProps } from "../visualizer";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";
import { useStudioStore } from "@/stores/studioStore";

export default function {{VISUALIZER_NAME}}({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#FFFFFF',
}: VisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const textureData = useVisualizerTexture();
  const { audioSensitivity } = useStudioStore();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  // Audio analysis with proper scaling
  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return Math.min(sum / 86 / 255, 1.0);
  }, [frequency]);
  
  const mids = useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
    return Math.min(sum / 85 / 255, 1.0);
  }, [frequency]);
  
  const highs = useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
    return Math.min(sum / 85 / 255, 1.0);
  }, [frequency]);

  // CRITICAL: Use white material for proper texture mapping
  const material = useMemo(() => 
    createVisualizerMaterial('#ffffff', textureData, {
      transparent: true,
      opacity: 0.9,
      basic: true,
    }), [textureData]
  );

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      
      // Apply audio sensitivity multipliers for audio-reactivity
      const bassIntensity = bass * (audioSensitivity?.bassMultiplier || 1);
      const midsIntensity = mids * (audioSensitivity?.midsMultiplier || 1);
      const highsIntensity = highs * (audioSensitivity?.highsMultiplier || 1);
      const speedMultiplier = audioSensitivity?.animationSpeed || 1;
      
      {{ANIMATION_LOGIC}}
    }
  });
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      
      <group ref={groupRef}>
        {{RENDER_LOGIC}}
      </group>
    </>
  );
}`;

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
    let generationPrompt = `You are an expert in creating Three.js React audio visualizers. Create a stunning, UNIQUE visualizer based on this description: "${prompt}"

GENERATION ID: ${timestamp}-${randomSeed}

CRITICAL REQUIREMENTS:
1. The visualizer MUST be audio-reactive using bassIntensity, midsIntensity, and highsIntensity variables
2. Use ONLY white (#ffffff) materials - NEVER use any other colors, even with low opacity
3. MUST include natural resting animations (gentle rotation, breathing, subtle movements) when no audio is present
4. Create smooth, organic animations that respond to audio frequency data
5. Use the provided white material variable (already configured with createVisualizerMaterial)
6. Include proper audio sensitivity multipliers in all animations
7. Create visually striking 3D geometry that matches the description uniquely
8. Use React Three Fiber patterns and hooks properly
9. Keep animations smooth and performance-optimized
10. MUST respond to audio - scale, rotate, or modify based on bassIntensity, midsIntensity, highsIntensity
11. ALL meshes must use the white material variable - NO exceptions
12. Add natural idle animations like gentle rotation or breathing motion using time (t)

ABSOLUTE FORMAT RULES:
- Do NOT include any import statements.
- Do NOT use TypeScript types or generics. Use plain JavaScript only.
- Only use these in-scope variables: React, useFrame, THREE, useVisualizerTexture, createVisualizerMaterial, useStudioStore.
- Return a single React component that fills the template EXACTLY.

Replace {{VISUALIZER_NAME}} with a proper React component name (PascalCase, no spaces).
Replace {{ANIMATION_LOGIC}} with animation code that uses bassIntensity, midsIntensity, highsIntensity.
Replace {{RENDER_LOGIC}} with 3D objects that use the white material variable.

EXAMPLE PATTERNS:
- Natural rotation: groupRef.current.rotation.z = t * 0.05 + bassIntensity * 0.1
- Breathing motion: groupRef.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.02 + bassIntensity * 0.5)
- Audio-reactive position: mesh.position.y = Math.sin(t + bassIntensity * 10) * highsIntensity
- Combined effects: mesh.rotation.y = t * 0.1 + midsIntensity * 2

MANDATORY: Include both resting animations (using time t) AND audio-reactive animations.
Focus on creating something visually UNIQUE and engaging. Each generation must be completely different.`;

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
    
    // Validate the generated code has required components
    if (!generatedCode || !generatedCode.includes('export default function') || !generatedCode.includes('useFrame')) {
      throw new Error('Generated code is incomplete or invalid');
    }
    
    // Sanitize generated code to ensure it's runtime-safe JS
    const cleanedCode = generatedCode
      .replace(/^[\t ]*import[^;]+;?$/gm, '')
      .replace(/useRef<[^>]+>\(/g, 'useRef(')
      .replace(/useMemo<[^>]+>\(/g, 'useMemo(')
      .replace(/: [A-Za-z0-9_<>,\[\]\|\.\s]+(?=[,)}\r\n])/g, '')
      .replace(/\sas\s+[A-Za-z0-9_<>,\[\]\.\s]+/g, '');
    
    // Extract visualizer name from the cleaned code
    const nameMatch = cleanedCode.match(/export default function (\w+)/);
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