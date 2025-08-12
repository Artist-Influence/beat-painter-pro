import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudioStore } from "@/stores/studioStore";
import { toast } from "sonner";

const AudioUploader: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setAudioElement, audioElement } = useStudioStore();

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    setAudioElement(audio);
    toast.success("Audio loaded. Press play to preview.");
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        variant="default"
        onClick={() => fileInputRef.current?.click()}
      >
        Choose Audio
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          if (!audioElement) return toast.error("Load audio first");
          if (audioElement.paused) audioElement.play(); else audioElement.pause();
        }}
      >
        {audioElement?.paused ?? true ? "Play" : "Pause"}
      </Button>
    </div>
  );
};

export default AudioUploader;
