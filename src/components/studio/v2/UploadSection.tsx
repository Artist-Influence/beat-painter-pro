import React, { useRef } from 'react';
import { Upload, Music, FileText } from 'lucide-react';
import { useStudioStore } from '@/stores/studioStore';
import { toast } from 'sonner';

export function UploadSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setAudioElement, audioElement } = useStudioStore();

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    setAudioElement(audio);
    toast.success("Audio loaded successfully!");
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
                Audio loaded
              </p>
              <p className="text-white/40 text-xs">
                Duration: {audioElement.duration ? `${Math.floor(audioElement.duration / 60)}:${Math.floor(audioElement.duration % 60).toString().padStart(2, '0')}` : 'Unknown'}
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

    </div>
  );
}