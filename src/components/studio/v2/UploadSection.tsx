import React, { useRef, useState, useEffect } from 'react';
import { Upload, Music, ImageIcon, X } from 'lucide-react';
import { useStudioStore } from '@/stores/studioStore';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';

export function UploadSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { setAudioElement, audioElement, audioFileName, logo, setLogo, setLogoSize, setLogoOpacity, setLogoLayer, setLogoColorMode, clearLogo } = useStudioStore();
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
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    setAudioElement(audio, file.name);
    toast.success("Audio loaded successfully!");
  };

  const handleLogoFile = (file: File) => {
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
      <h3 className="text-white/80 text-sm font-medium mb-3">Audio Upload</h3>
      
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
        className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-purple-500/50 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-8 h-8 text-white/40 mx-auto mb-3" />
        <p className="text-white/60 text-sm mb-2">
          Drop your audio file here
        </p>
        <p className="text-white/40 text-xs">
          or click to browse
        </p>
      </div>

      {/* Current Audio Info */}
      {audioElement && (
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-3">
            <Music className="w-4 h-4 text-purple-400" />
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-sm truncate">
                {audioFileName || "Audio loaded"}
              </p>
              <p className="text-white/40 text-xs">
                Duration: {duration 
                  ? `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}` 
                  : 'Loading...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Tips */}
      <div className="bg-purple-600/10 border border-purple-500/20 rounded-lg p-3">
        <h4 className="text-purple-300 text-xs font-medium mb-2">💡 Tips</h4>
        <ul className="text-white/60 text-xs space-y-1">
          <li>• Supports MP3, WAV, M4A, FLAC</li>
          <li>• Higher quality = better visualization</li>
          <li>• Songs with dynamic range work best</li>
        </ul>
      </div>

      {/* Logo Upload Section */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="text-white/80 text-sm font-medium mb-3">Logo Overlay</h3>
        
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
            className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center hover:border-purple-500/50 transition-colors cursor-pointer"
            onClick={() => logoInputRef.current?.click()}
          >
            <ImageIcon className="w-6 h-6 text-white/40 mx-auto mb-2" />
            <p className="text-white/60 text-xs">
              Drop your logo here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Logo Preview */}
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-3">
                <img 
                  src={logo.url} 
                  alt="Logo preview" 
                  className="w-10 h-10 object-contain rounded"
                />
                <div className="flex-1">
                  <p className="text-white/80 text-sm">Logo loaded</p>
                  <p className="text-white/40 text-xs">Drag on screen to position</p>
                </div>
                <button
                  onClick={clearLogo}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>

            {/* Size Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Size</span>
                <span className="text-white/40">{logo.size}px</span>
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
                <span className="text-white/60">Opacity</span>
                <span className="text-white/40">{logo.opacity}%</span>
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
              <span className="text-white/60 text-xs">Layer</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setLogoLayer('behind')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    logo.layer === 'behind' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white/10 text-white/60 hover:bg-white/15'
                  }`}
                >
                  Behind
                </button>
                <button 
                  onClick={() => setLogoLayer('front')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    logo.layer === 'front' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white/10 text-white/60 hover:bg-white/15'
                  }`}
                >
                  In Front
                </button>
              </div>
            </div>

            {/* Color Mode Selector */}
            <div className="space-y-2">
              <span className="text-white/60 text-xs">Color</span>
              <div className="grid grid-cols-2 gap-1">
                {(['original', 'invert'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setLogoColorMode(mode)}
                    className={`px-2 py-1.5 rounded text-xs capitalize transition-colors ${
                      logo.colorMode === mode 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-white/10 text-white/60 hover:bg-white/15'
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