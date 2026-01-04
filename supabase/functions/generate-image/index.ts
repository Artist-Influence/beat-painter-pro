import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as b64encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    const combinedPrompt = negativePrompt
      ? `${prompt}. Avoid: ${negativePrompt}`
      : prompt;

    console.log("Generating image with prompt:", combinedPrompt);

    // Use the NEW Hugging Face router endpoint directly
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: combinedPrompt,
          parameters: {
            seed: seed || Math.floor(Math.random() * 1000000),
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HF API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "HF API error", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = b64encode(new Uint8Array(arrayBuffer));
    const dataUrl = `data:image/png;base64,${base64}`;

    console.log("Image generated successfully");

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