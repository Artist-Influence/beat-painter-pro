import React, { useRef, useState, useEffect } from 'react';
import { Upload, Music, ImageIcon, X, Radio, Maximize2 } from 'lucide-react';
import { useStudioStore } from '@/stores/studioStore';
import { useTvFullscreen } from '@/hooks/useTvFullscreen';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

export function UploadSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { setAudioElement, audioElement, audioFileName, logo, setLogo, setLogoSize, setLogoOpacity, setLogoLayer, setLogoColorMode, clearLogo, autoPilot, setAutoPilot } = useStudioStore();
  const { isFullscreen, toggle: toggleTvFullscreen } = useTvFullscreen();
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (!audioElement) {
      setDuration(null);
      return;
    }

    const handleLoadedMetadata = () => {
      setDuration(audioElement.duration);
    };

    if (audioElement.duration && !isNaN(audioElement.duration)) {
      setDuration(audioElement.duration);
    }

    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioElement]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error('That doesn’t look like an audio file. Try an MP3, WAV, or M4A.');
      return;
    }
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    setAudioElement(audio, file.name);
    toast.success("Audio loaded successfully!");
  };

  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file for the logo (PNG or SVG works best).');
      return;
    }
    const url = URL.createObjectURL(file);
    setLogo(url);
    toast.success("Logo added!");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => file.type.startsWith('audio/'));
    if (audioFile) {
      handleFile(audioFile);
    } else {
      toast.error("Please upload an audio file");
    }
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    if (imageFile) {
      handleLogoFile(imageFile);
    } else {
      toast.error("Please upload an image file");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-4">
      <div className="mb-3"><p className="text-eyebrow">no track yet</p><h3 className="text-text-primary text-sm font-semibold">Drop audio to start</h3></div>
      
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border border-dashed border-hairline/60 rounded-xl p-6 text-center hover:border-ai-red/50 hover:bg-ai-red/[0.04] transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-8 h-8 text-text-tertiary mx-auto mb-3" />
        <p className="text-text-tertiary text-sm mb-2">
          Drop your audio file here
        </p>
        <p className="text-text-tertiary text-xs">
          or click to browse
        </p>
      </div>

      {/* Current Audio Info */}
      {audioElement && (
        <div className="bg-surface-2/40 rounded-md p-3 border border-hairline/50">
          <div className="flex items-center gap-3">
            <Music className="w-4 h-4 text-ai-red" />
            <div className="flex-1 min-w-0">
              <p className="text-text-secondary text-sm truncate">
                {audioFileName || "Audio loaded"}
              </p>
              <p className="text-text-tertiary text-xs">
                Duration: {duration 
                  ? `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}` 
                  : 'Loading...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Auto-pilot / party mode */}
      <div className="rounded-md p-3 border border-hairline/50 bg-surface-2/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${autoPilot ? 'text-ai-red' : 'text-text-tertiary'}`} />
            <div>
              <p className="text-eyebrow">party mode</p>
              <p className="text-text-primary text-sm font-medium">Auto-pilot</p>
            </div>
          </div>
          <Switch checked={autoPilot} onCheckedChange={setAutoPilot} />
        </div>
        <p className="text-caption mt-2">
          Plays your mix and swaps visualizers every 20-60s. Load a long set, hit play, go fullscreen, and
          screencast it as an ambient background.
        </p>
        <button
          onClick={toggleTvFullscreen}
          className="btn btn-glass w-full h-10 mt-3 text-sm gap-2"
          title="Fill the whole screen with just the visuals — ideal for a TV or screencast (Esc to exit)"
        >
          <Maximize2 className="w-4 h-4" />
          {isFullscreen ? 'Exit fullscreen' : 'Fullscreen for TV'}
        </button>
      </div>

      {/* Upload Tips */}
      <div className="bg-ai-red/[0.06] border border-ai-red/20 rounded-md p-3">
        <h4 className="text-eyebrow mb-2">💡 Tips</h4>
        <ul className="text-text-tertiary text-xs space-y-1">
          <li>• Supports MP3, WAV, M4A, FLAC</li>
          <li>• Higher quality = better visualization</li>
          <li>• Songs with dynamic range work best</li>
        </ul>
      </div>

      {/* Logo Upload Section */}
      <div className="pt-4 border-t border-hairline/40">
        <div className="mb-3"><p className="text-eyebrow">overlay</p><h3 className="text-text-primary text-sm font-semibold">Logo</h3></div>
        
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleLogoFile(file);
          }}
        />

        {!logo.url ? (
          <div
            onDrop={handleLogoDrop}
            onDragOver={handleDragOver}
            className="border border-dashed border-hairline/60 rounded-xl p-4 text-center hover:border-ai-red/50 hover:bg-ai-red/[0.04] transition-colors cursor-pointer"
            onClick={() => logoInputRef.current?.click()}
          >
            <ImageIcon className="w-6 h-6 text-text-tertiary mx-auto mb-2" />
            <p className="text-text-tertiary text-xs">
              Drop your logo here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Logo Preview */}
            <div className="bg-surface-2/40 rounded-md p-3 border border-hairline/50">
              <div className="flex items-center gap-3">
                <img 
                  src={logo.url} 
                  alt="Logo preview" 
                  className="w-10 h-10 object-contain rounded"
                />
                <div className="flex-1">
                  <p className="text-text-secondary text-sm">Logo loaded</p>
                  <p className="text-text-tertiary text-xs">Drag on screen to position</p>
                </div>
                <button
                  onClick={clearLogo}
                  className="p-1.5 hover:bg-ai-red/[0.08] rounded-md transition-colors"
                >
                  <X className="w-4 h-4 text-text-tertiary" />
                </button>
              </div>
            </div>

            {/* Size Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-text-tertiary">Size</span>
                <span className="text-text-tertiary">{logo.size}px</span>
              </div>
              <Slider
                value={[logo.size]}
                onValueChange={([value]) => setLogoSize(value)}
                min={20}
                max={1000}
                step={5}
                className="w-full"
              />
            </div>

            {/* Opacity Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-text-tertiary">Opacity</span>
                <span className="text-text-tertiary">{logo.opacity}%</span>
              </div>
              <Slider
                value={[logo.opacity]}
                onValueChange={([value]) => setLogoOpacity(value)}
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Layer Toggle */}
            <div className="space-y-2">
              <span className="text-text-tertiary text-xs">Layer</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setLogoLayer('behind')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    logo.layer === 'behind' 
                      ? 'bg-ai-red/[0.12] text-ai-red border border-ai-red' 
                      : 'bg-surface-2/40 text-text-tertiary border border-hairline/50 hover:border-ai-red/40'
                  }`}
                >
                  Behind
                </button>
                <button 
                  onClick={() => setLogoLayer('front')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    logo.layer === 'front' 
                      ? 'bg-ai-red/[0.12] text-ai-red border border-ai-red' 
                      : 'bg-surface-2/40 text-text-tertiary border border-hairline/50 hover:border-ai-red/40'
                  }`}
                >
                  In Front
                </button>
              </div>
            </div>

            {/* Color Mode Selector */}
            <div className="space-y-2">
              <span className="text-text-tertiary text-xs">Color</span>
              <div className="grid grid-cols-2 gap-1">
                {(['original', 'invert'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setLogoColorMode(mode)}
                    className={`px-2 py-1.5 rounded text-xs capitalize transition-colors ${
                      logo.colorMode === mode 
                        ? 'bg-ai-red/[0.12] text-ai-red border border-ai-red' 
                        : 'bg-surface-2/40 text-text-tertiary border border-hairline/50 hover:border-ai-red/40'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}