import React, { useEffect, useRef } from "react";
import AudioUploader from "./AudioUploader";
import RecordingControls from "./RecordingControls";
import VisualizerCanvas from "@/components/visualizer/VisualizerCanvas";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
const StudioLayout: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    <div className="container mx-auto p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Audio Visual Studio</h1>
        <nav className="flex items-center gap-2">
          <Link to="/admin">
            <Button variant="secondary">Admin</Button>
          </Link>
        </nav>
      </header>
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <VisualizerCanvas canvasRef={canvasRef} />
        </section>
        <aside className="lg:col-span-1 space-y-4">
          <AudioUploader />
          <RecordingControls canvasRef={canvasRef} />
        </aside>
      </main>
    </div>
  );
};

export default StudioLayout;
