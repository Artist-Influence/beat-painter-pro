import { useState, useCallback } from 'react';

interface TextureGeneratorState {
  isGenerating: boolean;
  error: string | null;
  currentTexture: string | null;
}

// Predefined texture patterns that work well with visualizers
const TEXTURE_PATTERNS = {
  'psychedelic swirls': 'radial-gradient(circle, #ff006e 0%, #8338ec 25%, #3a86ff 50%, #06ffa5 75%, #ffbe0b 100%)',
  'neon grid': 'repeating-linear-gradient(45deg, #00ff00 0px, #00ff00 2px, transparent 2px, transparent 10px), repeating-linear-gradient(-45deg, #ff00ff 0px, #ff00ff 2px, transparent 2px, transparent 10px)',
  'plasma waves': 'linear-gradient(45deg, #ff0080 0%, #0080ff 25%, #8000ff 50%, #ff8000 75%, #80ff00 100%)',
  'cosmic dust': 'radial-gradient(ellipse at center, rgba(255,255,255,0.8) 0%, rgba(128,0,255,0.6) 30%, rgba(0,255,128,0.4) 60%, rgba(255,128,0,0.2) 100%)',
  'electric lines': 'repeating-linear-gradient(0deg, #00ffff 0px, #00ffff 1px, transparent 1px, transparent 5px), repeating-linear-gradient(90deg, #ff00ff 0px, #ff00ff 1px, transparent 1px, transparent 5px)'
};

export const useTextureGenerator = () => {
  const [state, setState] = useState<TextureGeneratorState>({
    isGenerating: false,
    error: null,
    currentTexture: null,
  });

  const generateTexture = useCallback(async (prompt: string) => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    
    try {
      // Simulate generation delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Find the best matching pattern or use a default
      const matchedPattern = Object.entries(TEXTURE_PATTERNS).find(([key]) => 
        prompt.toLowerCase().includes(key)
      );
      
      const pattern = matchedPattern ? matchedPattern[1] : TEXTURE_PATTERNS['psychedelic swirls'];
      
      // Create a canvas with the CSS gradient pattern
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Create a temporary div to render the gradient
        const tempDiv = document.createElement('div');
        tempDiv.style.width = '512px';
        tempDiv.style.height = '512px';
        tempDiv.style.background = pattern;
        tempDiv.style.position = 'absolute';
        tempDiv.style.top = '-9999px';
        document.body.appendChild(tempDiv);
        
        // Convert to canvas
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, '#ff006e');
        gradient.addColorStop(0.25, '#8338ec');
        gradient.addColorStop(0.5, '#3a86ff');
        gradient.addColorStop(0.75, '#06ffa5');
        gradient.addColorStop(1, '#ffbe0b');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // Add some noise for texture
        const imageData = ctx.getImageData(0, 0, 512, 512);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const noise = Math.random() * 0.2 - 0.1;
          data[i] = Math.min(255, Math.max(0, data[i] + noise * 255));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 255));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 255));
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        const textureUrl = canvas.toDataURL('image/png');
        
        // Store texture globally for visualizers to use
        (window as any).appliedTexture = textureUrl;
        
        // Dispatch event to notify visualizers
        window.dispatchEvent(new CustomEvent('texture:applied', { detail: textureUrl }));
        
        document.body.removeChild(tempDiv);
        setState(prev => ({ ...prev, isGenerating: false, currentTexture: textureUrl }));
      }
    } catch (error) {
      console.error('Texture generation error:', error);
      setState(prev => ({ 
        ...prev, 
        isGenerating: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, []);

  const clearTexture = useCallback(() => {
    (window as any).appliedTexture = null;
    window.dispatchEvent(new CustomEvent('texture:cleared'));
    setState(prev => ({ ...prev, currentTexture: null }));
  }, []);

  return {
    ...state,
    generateTexture,
    clearTexture,
    availablePatterns: Object.keys(TEXTURE_PATTERNS),
  };
};