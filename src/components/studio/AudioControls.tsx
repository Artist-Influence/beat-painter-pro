import React, { useEffect, useState } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AudioControls({ audioElement }: { audioElement: HTMLAudioElement | null }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!audioElement) return;

    const updateTime = () => setCurrentTime(audioElement.currentTime || 0);
    const updateDuration = () => setDuration(audioElement.duration || 0);
    const updatePlaying = () => setIsPlaying(!audioElement.paused);

    audioElement.addEventListener("timeupdate", updateTime);
    audioElement.addEventListener("loadedmetadata", updateDuration);
    audioElement.addEventListener("play", updatePlaying);
    audioElement.addEventListener("pause", updatePlaying);

    // Initialize
    updateDuration();
    updateTime();
    updatePlaying();

    return () => {
      audioElement.removeEventListener("timeupdate", updateTime);
      audioElement.removeEventListener("loadedmetadata", updateDuration);
      audioElement.removeEventListener("play", updatePlaying);
      audioElement.removeEventListener("pause", updatePlaying);
    };
  }, [audioElement]);

  const handleSeek = (value: number) => {
    if (audioElement) {
      audioElement.currentTime = value;
      setCurrentTime(value);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor((time || 0) / 60);
    const secs = Math.floor((time || 0) % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => audioElement && (audioElement.currentTime = Math.max(0, (audioElement.currentTime || 0) - 10))} aria-label="Back 10 seconds">
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => audioElement && (isPlaying ? audioElement.pause() : audioElement.play())}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => audioElement && (audioElement.currentTime = Math.min(duration || 0, (audioElement.currentTime || 0) + 10))} aria-label="Forward 10 seconds">
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-12">{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={(e) => handleSeek(parseFloat(e.target.value))}
          className="flex-1 h-2 cursor-pointer rounded-lg bg-muted accent-foreground"
          aria-label="Seek"
        />
        <span className="text-xs text-muted-foreground w-12">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
