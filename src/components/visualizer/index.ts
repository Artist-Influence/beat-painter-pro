export interface VisualizerProps {
  audioData: {
    frequency: number[]; // 256 values preferred
    amplitude: number;   // 0-1
    beatStrength: number; // 0-1
  };
  isPlaying?: boolean; // true when audio is playing, false when paused
  styleAdjustments?: {
    brightness: number; // 0-200, default 100
    saturation: number; // 0-200, default 100
    contrast: number;   // 0-200, default 100
  };
  width?: number;  // default 1080
  height?: number; // default 1080
  zoomLevel?: number; // 0.5-2, default 1
  backgroundColor?: string; // '#00FF00' | '#FFFFFF' | '#000000'
}

export type VisualizerComponent = React.ComponentType<VisualizerProps>;
