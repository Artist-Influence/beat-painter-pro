
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HfInference } from "https://esm.sh/@huggingface/inference@2.3.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, negativePrompt, seed } = await req.json();
    const token = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");

    if (!token) {
      console.error("Missing HUGGING_FACE_ACCESS_TOKEN secret");
      return new Response(
        JSON.stringify({ error: "Missing Hugging Face token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hf = new HfInference(token);

    // Basic way to include a negative prompt within a single text-to-image prompt
    const combinedPrompt = negativePrompt
      ? `${prompt}. Avoid: ${negativePrompt}`
      : prompt;

    // Use a fast, high-quality model
    const image = await hf.textToImage({
      inputs: combinedPrompt,
      model: "black-forest-labs/FLUX.1-schnell",
      // Note: HfInference doesn't expose seed directly for all models.
      // Include seed hints in the prompt to encourage variation.
    });

    const arrayBuffer = await image.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:image/png;base64,${base64}`;

    return new Response(
      JSON.stringify({ image: dataUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-image error:", error);
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
