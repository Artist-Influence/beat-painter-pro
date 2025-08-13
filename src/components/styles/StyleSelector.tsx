import React, { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { generateStyleTexture } from "@/lib/styleGenerator";
import { Button } from "@/components/ui/button";

const STYLE_OPTIONS = [
  "Neon Glow",
  "Metallic Chrome",
  "Organic Flow",
  "Cyberpunk Grid",
  "Retro Wave",
  "Crystal Shards",
  "Holographic Film",
  "Lava Flow",
  "Electric Storm",
  "Marble Veins",
  "Aurora Borealis",
  "Vaporwave Gradient",
];

export function StyleSelector() {
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : prev.length < 3 ? [...prev, style] : prev
    );
  };

  const applyStyles = async () => {
    if (selectedStyles.length === 0 || isApplying) return;
    setIsApplying(true);
    try {
      const { textureUrl, colors } = await generateStyleTexture(selectedStyles);
      (window as any).appliedTexture = textureUrl;
      (window as any).extractedColors = colors;
      setIsOpen(false);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="relative">
      <Button onClick={() => setIsOpen((v) => !v)} variant="secondary" className="flex items-center gap-2">
        <Sparkles className="h-4 w-4" /> Styles ({selectedStyles.length}/3)
      </Button>

      {isOpen && (
        <div className="absolute top-12 left-0 z-50 w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-popover p-4 shadow-md">
          <div className="grid grid-cols-2 gap-2">
            {STYLE_OPTIONS.map((style) => (
              <button
                key={style}
                onClick={() => toggleStyle(style)}
                className={`relative rounded-lg border px-3 py-2 text-sm transition-colors ${
                  selectedStyles.includes(style)
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {style}
                {selectedStyles.includes(style) && (
                  <Check className="absolute right-1 top-1 h-3 w-3 text-primary" />
                )}
              </button>
            ))}
          </div>

          <Button onClick={applyStyles} disabled={selectedStyles.length === 0 || isApplying} className="mt-4 w-full">
            {isApplying ? "Applying..." : "Apply Styles"}
          </Button>
        </div>
      )}
    </div>
  );
}
