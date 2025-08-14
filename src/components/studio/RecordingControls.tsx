import React, { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { visualizerRegistry } from "@/components/visualizers";
import { useWebMRecorder } from "@/hooks/useWebMRecorder";
import { useStudioStore } from "@/stores/studioStore";
import { logEvent } from "@/lib/analytics";
import TextureControls from "./TextureControls";
import AudioResponseControls from "./AudioResponseControls";

interface RecordingControlsProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const RecordingControls: React.FC<RecordingControlsProps> = ({ canvasRef }) => {
  const { selected, setSelected, backgroundColor, setBackground, filters, setFilters, zoomLevel, setZoom, audioElement } = useStudioStore();
  const [startAt, setStartAt] = useState(0);
  const { startRecording, stopRecording, isRecording } = useWebMRecorder({ canvasRef, audioElement });

  const visualizerOptions = useMemo(() => Object.keys(visualizerRegistry), []);
  const formatVisualizerName = (name: string) => name.replace(/Visualizer$/, '');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Visualizer</Label>
        <Select value={selected} onValueChange={(v) => { setSelected(v as any); logEvent("visualizer_selected", { visualizer_key: v }); }}>
          <SelectTrigger>
            <SelectValue placeholder="Select visualizer" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {visualizerOptions.map((k) => (
              <SelectItem key={k} value={k}>{formatVisualizerName(k)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button variant={backgroundColor === "#00FF00" ? "default" : "outline"} onClick={() => setBackground("#00FF00")}>Green</Button>
        <Button variant={backgroundColor === "#FFFFFF" ? "default" : "outline"} onClick={() => setBackground("#FFFFFF")}>White</Button>
        <Button variant={backgroundColor === "#000000" ? "default" : "outline"} onClick={() => setBackground("#000000")}>Black</Button>
      </div>

      <div className="space-y-2">
        <Label>Brightness: {filters.brightness}%</Label>
        <Slider value={[filters.brightness]} min={0} max={200} step={1} onValueChange={([v]) => setFilters({ brightness: v })} />
      </div>
      <div className="space-y-2">
        <Label>Saturation: {filters.saturation}%</Label>
        <Slider value={[filters.saturation]} min={0} max={200} step={1} onValueChange={([v]) => setFilters({ saturation: v })} />
      </div>
      <div className="space-y-2">
        <Label>Contrast: {filters.contrast}%</Label>
        <Slider value={[filters.contrast]} min={0} max={200} step={1} onValueChange={([v]) => setFilters({ contrast: v })} />
      </div>

      <div className="space-y-2">
        <Label>Zoom: {zoomLevel.toFixed(2)}x</Label>
        <Slider value={[zoomLevel]} min={0.5} max={2} step={0.01} onValueChange={([v]) => setZoom(v)} />
      </div>

      <TextureControls />

      <AudioResponseControls />

      <div className="flex items-center gap-2">
        <Label className="whitespace-nowrap">Start at (s)</Label>
        <input type="number" className="w-24 rounded-md border border-border bg-background px-2 py-1" value={startAt} min={0} onChange={(e) => setStartAt(Number(e.target.value))} />
      </div>

      <Button
        variant={isRecording ? "destructive" : "default"}
        onClick={() => {
          if (isRecording) {
            stopRecording();
            logEvent("recording_stopped", { visualizer_key: selected });
          } else {
            logEvent("recording_started", { visualizer_key: selected });
            startRecording(startAt, backgroundColor, selected);
          }
        }}
      >
        {isRecording ? "Stop" : "REC"}
      </Button>
    </div>
  );
};

export default RecordingControls;
