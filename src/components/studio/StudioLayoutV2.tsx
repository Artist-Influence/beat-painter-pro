import React, { useState } from 'react';
import VisualizerCanvas from '@/components/visualizer/VisualizerCanvas';
import { TopBar } from './v2/TopBar';
import { LeftPanel } from './v2/LeftPanel';
import { RightPanel } from './v2/RightPanel';
import { BottomBar } from './v2/BottomBar';
import { FloatingActions } from './v2/FloatingActions';
import { LogoOverlay } from './v2/LogoOverlay';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useStudioStore } from '@/stores/studioStore';

type LeftPanelType = 'visualizers' | 'styles' | null;
type RightPanelType = 'controls' | 'upload' | null;

export function StudioLayoutV2() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const { logo, background } = useStudioStore();
  const [activePanels, setActivePanels] = useState({
    left: 'visualizers' as LeftPanelType,
    right: 'controls' as RightPanelType,
    bottom: true
  });

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Background Layer - Color, Image, or Video */}
      {background.type === 'video' && background.mediaUrl ? (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover z-[0]"
          src={background.mediaUrl}
          autoPlay
          loop
          muted
          playsInline
        />
      ) : background.type === 'image' && background.mediaUrl ? (
        <img
          className="absolute inset-0 w-full h-full object-cover z-[0]"
          src={background.mediaUrl}
          alt="Background"
        />
      ) : (
        <div 
          className="absolute inset-0 z-[0]" 
          style={{ backgroundColor: background.color }}
        />
      )}
      {/* Logo Behind Visualizer - lower z-index */}
      {logo.layer === 'behind' && (
        <div className="absolute inset-0 z-[1]">
          <LogoOverlay />
        </div>
      )}

      {/* Full-Screen Visualizer Canvas */}
      <div className="absolute inset-0 z-[2]">
        <VisualizerCanvas canvasRef={canvasRef} logoBehind={logo.layer === 'behind'} />
      </div>

      {/* Logo In Front of Visualizer - higher z-index */}
      {logo.layer === 'front' && (
        <div className="absolute inset-0 z-[10] pointer-events-none">
          <LogoOverlay />
        </div>
      )}

      {/* Top Bar - Minimal, Transparent */}
      <TopBar canvasRef={canvasRef} />

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
