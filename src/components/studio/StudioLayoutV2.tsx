import React, { useState } from 'react';
import VisualizerCanvas from '@/components/visualizer/VisualizerCanvas';
import { TopBar } from './v2/TopBar';
import { LeftPanel } from './v2/LeftPanel';
import { RightPanel } from './v2/RightPanel';
import { BottomBar } from './v2/BottomBar';
import { FloatingActions } from './v2/FloatingActions';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

type LeftPanelType = 'visualizers' | 'styles' | 'custom' | null;
type RightPanelType = 'controls' | 'upload' | null;

export function StudioLayoutV2() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [activePanels, setActivePanels] = useState({
    left: 'visualizers' as LeftPanelType,
    right: null as RightPanelType,
    bottom: true
  });

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Full-Screen Visualizer Canvas */}
      <div className="absolute inset-0">
        <VisualizerCanvas canvasRef={canvasRef} />
      </div>

      {/* Top Bar - Minimal, Transparent */}
      <TopBar />

      {/* Left Panel - Visualizer Selection */}
      <LeftPanel 
        activePanel={activePanels.left}
        setActivePanel={(panel) => setActivePanels({...activePanels, left: panel})}
      />

      {/* Right Panel - Controls */}
      <RightPanel 
        activePanel={activePanels.right}
        setActivePanel={(panel) => setActivePanels({...activePanels, right: panel})}
      />

      {/* Bottom Bar - Audio Controls */}
      <BottomBar 
        isVisible={activePanels.bottom}
        onToggle={(visible) => setActivePanels({...activePanels, bottom: visible})}
      />

      {/* Floating Action Buttons */}
      <FloatingActions />
    </div>
  );
}