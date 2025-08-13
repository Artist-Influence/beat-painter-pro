import React, { useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { generateStyleTexture, getStyleColors } from "@/lib/styleGenerator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ALL_STYLES = [
  "Neon Glow", "Metallic Chrome", "Organic Flow", "Cyberpunk Grid",
  "Retro Wave", "Crystal Shards", "Holographic Film", "Lava Flow",
  "Electric Storm", "Marble Veins", "Aurora Borealis", "Vaporwave Gradient",
  "Iridescent Film", "Prismatic Noise", "Moiré Pattern", "Circuit Trace",
  "Hex Mesh", "Particle Dust", "Ribbon Weave", "Sand Dunes",
  "Ocean Foam", "Glitch Stripe", "Chromatic Aberration", "Diffraction Rings",
  "Starfield", "Wireframe Blueprint", "Honeycomb Pattern", "Liquid Metal",
  "Frosted Glass", "Plasma Field", "Vapor Trails", "Ink Diffusion",
  "Nebula Clouds", "Tech Blueprint", "Origami Folds", "Fiber Optic",
  "Low Poly", "Speckled Granite", "Weathered Metal", "Velvet Texture",
  "Satin Sheen", "Volumetric Fog", "Shattered Glass", "Halftone Dots",
  "Wave Interference", "Checker Warp", "Gradient Flow", "Noise Cells",
  "Ripple Grid", "Voronoi Foam", "Polar Kaleidoscope", "Sunburst Rays"
];

export function StyleSelector() {
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStyles = ALL_STYLES.filter((style) =>
    style.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style)
        ? prev.filter((s) => s !== style)
        : prev.length < 3
        ? [...prev, style]
        : prev
    );
  };

  const generatePreviews = async () => {
    if (selectedStyles.length === 0) return;
    setIsGenerating(true);
    const urls: string[] = [];
    for (let i = 0; i < 3; i++) {
      const { textureUrl } = await generateStyleTexture(selectedStyles, i);
      urls.push(textureUrl);
    }
    setPreviews(urls);
    setIsGenerating(false);
  };

  const applyStyle = async (idx: number) => {
    const texture = previews[idx];
    const colors = getStyleColors(selectedStyles);
    (window as any).appliedTexture = texture;
    (window as any).extractedColors = colors;
    setIsOpen(false);
    setPreviews([]);
  };

  return (
    <div className="relative">
      <Button onClick={() => setIsOpen((v) => !v)} variant="secondary" className="flex items-center gap-2">
        <Sparkles className="h-4 w-4" /> Styles ({selectedStyles.length}/3)
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="w-[640px] max-h-[80vh] overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Select Styles (up to 3)</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <Input
              placeholder="Search styles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />

            <div className="mb-4 grid max-h-[300px] grid-cols-3 gap-2 overflow-y-auto">
              {filteredStyles.map((style) => (
                <button
                  key={style}
                  onClick={() => toggleStyle(style)}
                  disabled={!selectedStyles.includes(style) && selectedStyles.length >= 3}
                  className={`relative rounded-lg border px-3 py-2 text-sm transition-colors ${
                    selectedStyles.includes(style)
                      ? "border-primary/50 bg-primary/10"
                      : "border-border bg-card hover:bg-accent"
                  } ${
                    !selectedStyles.includes(style) && selectedStyles.length >= 3
                      ? "cursor-not-allowed opacity-50"
                      : ""
                  }`}
                >
                  {style}
                  {selectedStyles.includes(style) && (
                    <Check className="absolute right-1 top-1 h-3 w-3 text-primary" />
                  )}
                </button>
              ))}
            </div>

            {selectedStyles.length > 0 && (
              <div className="mb-4 rounded-lg bg-secondary p-3">
                <p className="mb-2 text-sm font-medium">Selected:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedStyles.map((style) => (
                    <span key={style} className="rounded bg-secondary px-2 py-1 text-sm">
                      {style}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedStyles.length > 0 && previews.length === 0 && (
              <Button onClick={generatePreviews} disabled={isGenerating} className="w-full">
                {isGenerating ? "Generating..." : "Generate Preview Styles"}
              </Button>
            )}

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {previews.map((preview, index) => (
                  <button key={index} className="group relative cursor-pointer" onClick={() => applyStyle(index)}>
                    <img src={preview} alt={`Style preview ${index + 1}`} className="h-32 w-full rounded-lg object-cover" />
                    <div className="absolute inset-0 hidden items-center justify-center rounded-lg bg-foreground/10 group-hover:flex">
                      <span className="text-sm font-medium">Apply Style {index + 1}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
