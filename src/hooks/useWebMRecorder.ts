import { useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UseRecorderProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  audioElement: HTMLAudioElement | null;
}

export const useWebMRecorder = ({ canvasRef, audioElement }: UseRecorderProps) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const keepRenderingRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const [isRecording, setIsRecording] = useState(false);

  const transparentRef = useRef<boolean>(false);
  const backgroundColorRef = useRef<string>('#000000');

  const startRecording = useCallback(async (startAtSeconds: number, backgroundColor: string, filenamePrefix: string, transparentBackground: boolean = false) => {
    if (!canvasRef.current || !audioElement) {
      toast.error("Canvas or audio not available");
      return;
    }

    try {
      const srcCanvas = canvasRef.current;
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = 1080;
      exportCanvas.height = 1080;
      const ctx = exportCanvas.getContext("2d", { alpha: transparentBackground });
      if (!ctx) {
        toast.error("Failed to create export canvas");
        return;
      }
      exportCanvasRef.current = exportCanvas;
      ctxRef.current = ctx;
      transparentRef.current = transparentBackground;
      backgroundColorRef.current = backgroundColor;

      chunksRef.current = [];
      keepRenderingRef.current = true;
      startTimeRef.current = startAtSeconds;

      audioElement.currentTime = startAtSeconds;

      const videoStream = exportCanvas.captureStream(60);
      const audioStream = (audioElement as any).captureStream ? (audioElement as any).captureStream() : null;

      const videoTracks = videoStream.getVideoTracks();
      const audioTracks = audioStream ? audioStream.getAudioTracks() : [];
      const combinedStream = new MediaStream([...videoTracks, ...audioTracks]);

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm;codecs=vp9,opus",
        videoBitsPerSecond: 8_000_000,
        audioBitsPerSecond: 192_000,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        const mins = Math.floor(startTimeRef.current / 60).toString().padStart(2, "0");
        const secs = Math.floor(startTimeRef.current % 60).toString().padStart(2, "0");
        const filename = `${filenamePrefix}, ${mins}:${secs} Start.webm`;

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setIsRecording(false);
        toast.success("Recording saved!");

        // Log a visualizer creation event for the authenticated user
        (async () => {
          try {
            const { data } = await supabase.auth.getUser();
            const u = data?.user;
            if (u) {
              await supabase.from("visualizer_events").insert({
                user_id: u.id,
                event_type: "recording_completed",
                created_at: new Date().toISOString(),
              });
            }
          } catch (e) {
            console.warn("Failed to log visualizer event", e);
          }
        })();
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setIsRecording(false);
        toast.error("Recording failed");
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Don't pause/play audio - let it continue as is
      if (audioElement.paused) {
        await audioElement.play();
      }

      const render = () => {
        if (!keepRenderingRef.current || !ctxRef.current || !exportCanvasRef.current) return;
        const ctx = ctxRef.current;
        const exportCanvas = exportCanvasRef.current;

        // Clear canvas first (needed for transparency)
        ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        // Only fill background if NOT transparent
        if (!transparentRef.current) {
          ctx.fillStyle = backgroundColorRef.current;
          ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        }
        
        ctx.drawImage(srcCanvas, 0, 0, exportCanvas.width, exportCanvas.height);

        requestAnimationFrame(render);
      };
      render();

      toast.success("Recording started. Tap again to stop.");
    } catch (error) {
      console.error("Start recording error:", error);
      setIsRecording(false);
      toast.error("Failed to start recording");
    }
  }, [canvasRef, audioElement]);

  const stopRecording = useCallback(() => {
    keepRenderingRef.current = false;
    try {
      mediaRecorderRef.current?.stop();
      // Don't pause audio when stopping recording - let it continue playing
    } catch (e) {
      console.error("Stop recording error:", e);
    }
  }, [audioElement]);

  return { startRecording, stopRecording, isRecording };
};
