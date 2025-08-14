import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Sparkles, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateStyleTexture, getStyleColors } from "@/lib/styleGenerator";

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
  "Ripple Grid", "Voronoi Foam", "Polar Kaleidoscope", "Sunburst Rays",
];

export function StyleSelector() {
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  const canAddMore = selectedStyles.length < 3;
  const selectedLabel = useMemo(() => `Styles (${selectedStyles.length}/3)`, [selectedStyles.length]);

  // Load persisted previews and styles on mount
  useEffect(() => {
    const savedPreviews = localStorage.getItem('style-previews');
    const savedStyles = localStorage.getItem('selected-styles');
    if (savedPreviews) {
      try {
        setPreviews(JSON.parse(savedPreviews));
      } catch (e) {
        console.warn('Failed to load saved previews:', e);
      }
    }
    if (savedStyles) {
      try {
        setSelectedStyles(JSON.parse(savedStyles));
      } catch (e) {
        console.warn('Failed to load saved styles:', e);
      }
    }
  }, []);

  // Persist previews when they change
  useEffect(() => {
    if (previews.length > 0) {
      localStorage.setItem('style-previews', JSON.stringify(previews));
    }
  }, [previews]);

  // Persist selected styles when they change
  useEffect(() => {
    localStorage.setItem('selected-styles', JSON.stringify(selectedStyles));
  }, [selectedStyles]);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const updatePos = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX, width: rect.width });
    };
    updatePos();
    const closeOnOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target) && buttonRef.current && !buttonRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    document.addEventListener("mousedown", closeOnOutside);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
      document.removeEventListener("mousedown", closeOnOutside);
    };
  }, [isDropdownOpen]);

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
    setProgress(0);
    setPreviews([]);
    for (let i = 0; i < 3; i++) {
      const { textureUrl } = await generateStyleTexture(selectedStyles, i);
      setPreviews((prev) => [...prev, textureUrl]);
      setProgress(i + 1);
    }
    setIsGenerating(false);
    setIsDropdownOpen(false);
    setProgress(0);
  };

  const applyStyle = async (previewIndex: number) => {
    const texture = previews[previewIndex];
    const colors = getStyleColors(selectedStyles);
    (window as any).appliedTexture = texture;
    (window as any).extractedColors = colors;
    setAppliedIndex(previewIndex);
    // Notify visualizers to refresh
    window.dispatchEvent(new CustomEvent('style:applied', { detail: { texture, colors } }));
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            type="button"
            ref={buttonRef}
            onClick={() => {
              if (!isDropdownOpen && buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                setMenuPos({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX, width: rect.width });
              }
              setIsDropdownOpen((v) => !v);
            }}
            variant="secondary"
            className="w-full justify-between"
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {selectedLabel}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </Button>
          <Button
            onClick={generatePreviews}
            disabled={isGenerating || selectedStyles.length === 0}
            aria-label="Generate style previews"
            className="w-full"
          >
            {isGenerating ? `Generating ${progress}/3…` : "Generate Previews"}
          </Button>
        </div>

        {/* Regenerate button when previews exist */}
        {previews.length > 0 && !isGenerating && (
          <Button
            onClick={generatePreviews}
            variant="outline"
            className="w-full mt-2"
            disabled={selectedStyles.length === 0}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate New Styles
          </Button>
        )}

{isDropdownOpen &&
          createPortal(
            <div ref={menuRef} className="fixed z-[9999] rounded-lg border border-border bg-popover shadow-xl" style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }} role="listbox">
              <div className="max-h-96 overflow-y-auto p-2">
                {ALL_STYLES.map((style) => {
                  const checked = selectedStyles.includes(style);
                  const disabled = !checked && !canAddMore;
                  return (
                    <label key={style} className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${checked ? "bg-accent/40" : "hover:bg-accent/30"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleStyle(style)} disabled={disabled} className="h-4 w-4" />
                      <span className="text-foreground">{style}</span>
                    </label>
                  );
                })}
              </div>
            </div>,
            document.body
          )}
      </div>

{/* Inline previews / loading */}
      {(isGenerating || previews.length > 0) && (
        <div>
          {isGenerating && previews.length === 0 ? (
            <>
              <div className="mb-2 text-xs text-muted-foreground">Generating previews...</div>
               <div className="grid grid-cols-1 gap-3">
                 {[0, 1, 2].map((i) => (
                   <div key={i} className="h-52 w-full rounded-lg bg-muted animate-pulse" />
                 ))}
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                {previews.map((src, i) => (
                  <button
                    key={i}
                    className="group relative overflow-hidden rounded-lg border border-border"
                    onClick={() => applyStyle(i)}
                    onDoubleClick={() => setSelectedPreview(i)}
                    title="Click to apply • Double-click to view"
                  >
                    <img src={src} alt={`Style preview ${i + 1}`} className="h-52 w-full object-cover" loading="lazy" />
                    <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-foreground/10 group-hover:flex">
                      <span className="text-sm font-medium">Double‑click to view</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-2 text-center text-xs text-muted-foreground">Click a preview to apply • Double‑click to view larger</div>
            </>
          )}
        </div>
      )}

      {/* Modal */}
      {selectedPreview !== null && previews[selectedPreview] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setSelectedPreview(null)}>
          <div className="relative max-h-[80vh] w-full max-w-3xl p-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPreview(null)}
              className="absolute right-4 top-4 rounded-full border border-border bg-card/80 p-2 backdrop-blur"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previews[selectedPreview]}
              alt={`Large style preview ${selectedPreview + 1}`}
              className="h-full w-full rounded-xl object-contain"
            />
            <div className="mt-3 flex justify-center">
              <Button onClick={() => applyStyle(selectedPreview)}>Apply This Style</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
