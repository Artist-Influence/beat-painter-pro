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
  
  // Audio analysis
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
      
      // Apply audio sensitivity multipliers
      const bassIntensity = bass * audioSensitivity.bassMultiplier;
      const midsIntensity = mids * audioSensitivity.midsMultiplier;
      const highsIntensity = highs * audioSensitivity.highsMultiplier;
      const speedMultiplier = audioSensitivity.animationSpeed;
      
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

    // Build the generation prompt
    let generationPrompt = `You are an expert in creating Three.js React audio visualizers. Create a stunning, unique visualizer based on this description: "${prompt}"

Requirements:
1. The visualizer MUST be audio-reactive using bass, mids, and highs variables
2. Use ONLY white (#ffffff) materials for seamless texture mapping
3. Create smooth, organic animations that respond to audio
4. Use createVisualizerMaterial with basic: true for proper texture mapping
5. Include proper audio sensitivity multipliers (bassIntensity, midsIntensity, highsIntensity)
6. Create visually striking 3D geometry that matches the description
7. Use React Three Fiber patterns and hooks properly
8. Keep animations smooth and performance-optimized

Replace {{VISUALIZER_NAME}} with a proper React component name (PascalCase, no spaces).
Replace {{ANIMATION_LOGIC}} with the animation code inside the useFrame hook.
Replace {{RENDER_LOGIC}} with the 3D objects and geometries.

Focus on creating something visually unique and audio-responsive. Make it beautiful and engaging.`;

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
    
    // Extract visualizer name from the generated code
    const nameMatch = generatedCode.match(/export default function (\w+)/);
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
        jsx_code: generatedCode,
        scale_factor: 1.0,
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
      code: generatedCode
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