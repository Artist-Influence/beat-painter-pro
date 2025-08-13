import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useTextureGenerator } from "@/hooks/useTextureGenerator";

const TextureControls: React.FC = () => {
  const [prompt, setPrompt] = useState("psychedelic swirls");
  const { isGenerating, error, currentTexture, generateTexture, clearTexture, availablePatterns } = useTextureGenerator();

  const handleGenerate = () => {
    if (prompt.trim()) {
      generateTexture(prompt.trim());
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>AI Texture Generator</Label>
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Try: psychedelic swirls, neon grid, plasma waves..."
          disabled={isGenerating}
        />
        <div className="text-xs text-muted-foreground">
          Available patterns: {availablePatterns?.join(', ')}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="flex-1"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Texture"
          )}
        </Button>
        
        {currentTexture && (
          <Button variant="outline" onClick={clearTexture}>
            Clear
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {currentTexture && (
        <div className="space-y-2">
          <Label>Current Texture:</Label>
          <img 
            src={currentTexture} 
            alt="Generated texture" 
            className="w-full h-20 object-cover rounded border"
          />
        </div>
      )}
    </div>
  );
};

export default TextureControls;