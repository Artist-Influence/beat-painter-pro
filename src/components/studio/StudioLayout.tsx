import React, { useEffect, useRef } from "react";
import AudioUploader from "./AudioUploader";
import RecordingControls from "./RecordingControls";
import { AudioControls } from "./AudioControls";
import { StyleSelector } from "@/components/styles/StyleSelector";
import VisualizerCanvas from "@/components/visualizer/VisualizerCanvas";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStudioStore } from "@/stores/studioStore";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
const StudioLayout: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { audioElement } = useStudioStore();
  useKeyboardShortcuts();
  
  useEffect(() => {
    document.title = "Audio Visual Studio – 3D Visualizers";
    const meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Create, style, and record audio‑reactive 3D visualizers in your browser.";
      document.head.appendChild(m);
    } else {
      (meta as HTMLMetaElement).content = "Create, style, and record audio‑reactive 3D visualizers in your browser.";
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 z-40 w-full border-b border-border bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-lg font-semibold text-foreground">Audio Visual Studio</h1>
          <nav className="flex items-center gap-2">
            <Link to="/admin">
              <Button variant="secondary">Admin</Button>
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 pt-20 pb-8">
        <main className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card/80 shadow-xl backdrop-blur">
              <VisualizerCanvas canvasRef={canvasRef} />
              <div className="pointer-events-auto absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent p-4">
                <AudioControls audioElement={audioElement} />
              </div>
            </div>
          </section>

          <aside className="space-y-4 lg:col-span-1">
            <div className="rounded-2xl border border-border bg-card/80 p-5 backdrop-blur">
              <AudioUploader />
            </div>
            <div className="rounded-2xl border border-border bg-card/80 p-5 backdrop-blur">
              <StyleSelector />
            </div>
            <div className="rounded-2xl border border-border bg-card/80 p-5 backdrop-blur">
              <RecordingControls canvasRef={canvasRef} />
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default StudioLayout;
