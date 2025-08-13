import { useEffect } from "react";
import { useStudioStore } from "@/stores/studioStore";

export const useKeyboardShortcuts = () => {
  const { audioElement, zoomLevel, setZoom } = useStudioStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (audioElement) {
            if (audioElement.paused) {
              audioElement.play();
            } else {
              audioElement.pause();
            }
          }
          break;

        case "ArrowLeft":
          e.preventDefault();
          if (audioElement) {
            audioElement.currentTime = Math.max(0, audioElement.currentTime - 5);
          }
          break;

        case "ArrowRight":
          e.preventDefault();
          if (audioElement) {
            audioElement.currentTime = Math.min(audioElement.duration || 0, audioElement.currentTime + 5);
          }
          break;

        case "Equal":
        case "NumpadAdd":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            setZoom(Math.min(3, zoomLevel + 0.1));
          }
          break;

        case "Minus":
        case "NumpadSubtract":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            setZoom(Math.max(0.5, zoomLevel - 0.1));
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [audioElement, zoomLevel, setZoom]);
};