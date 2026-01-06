import React, { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";

function NeonBuilding({ position, baseHeight, width, index, audioData, textureData }) {
  const buildingRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const windowsRef = useRef<THREE.Group>(null);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const freqData = safeAudioData.frequency || Array(256).fill(0);
  
  // Smoothing ref
  const smoothedFreq = useRef(0);

  // Use provided textureData for colors and texture mapping
  const primaryColor = textureData?.colors?.primary || '#ffffff';
  const secondaryColor = textureData?.colors?.secondary || '#ffff00';

  const buildingMaterial = useMemo(() => {
    return createVisualizerMaterial(
      primaryColor,
      textureData || { texture: null, colors: { primary: primaryColor, secondary: secondaryColor, accent: secondaryColor, isNeon: false, isMetallic: false }, textureVersion: 0 },
      {
        emissive: primaryColor,
        emissiveIntensity: 1.2,
        metalness: textureData?.colors?.isMetallic ? 0.9 : 0.7,
        roughness: textureData?.colors?.isMetallic ? 0.1 : 0.3,
      }
    );
  }, [primaryColor, secondaryColor, textureData]);

  const glowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(primaryColor),
      transparent: true,
      opacity: 0.9,
    });
  }, [primaryColor]);

  const windowMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(secondaryColor),
      emissive: new THREE.Color(secondaryColor),
      emissiveIntensity: 0.5,
    });
  }, [secondaryColor]);

  useFrame(() => {
    // Calculate audio per-frame
    const start = index * 8;
    const end = Math.min(start + 8, 256);
    let sum = 0;
    for (let i = start; i < end; i++) sum += freqData[i] || 0;
    const rawFreq = Math.min(sum / 8 / 255, 1.0);
    
    // Asymmetric smoothing
    const factor = rawFreq > smoothedFreq.current ? 0.5 : 0.2;
    smoothedFreq.current += (rawFreq - smoothedFreq.current) * factor;
    
    const buildingFreq = smoothedFreq.current;
    
    if (buildingRef.current && buildingMaterial) {
      // Height driven by audio (returns to base when silent)
      const height = Math.max(baseHeight + buildingFreq * 3.0, 0.1);
      
      // Width driven by audio (returns to base when silent)
      const audioWidth = Math.max(width * (1 + buildingFreq * 1.5), 0.1);
      const audioDepth = Math.max(width * (1 + buildingFreq * 1.2), 0.1);
      
      // Keep buildings on ground level - no Y movement
      buildingRef.current.scale.set(audioWidth, height, audioDepth);
      buildingRef.current.position.set(position[0], height / 2, position[2]);
      
      // Update material emissive intensity
      if (buildingMaterial.emissiveIntensity !== undefined) {
        buildingMaterial.emissiveIntensity = Math.min(1.2 + buildingFreq * 4.0, 10.0);
      }
    }
    
    if (glowRef.current && glowMaterial) {
      glowMaterial.opacity = Math.min(0.1 + buildingFreq * 0.3, 0.8);
    }
    
    if (windowsRef.current) {
      const showWindows = buildingFreq > 0.2;
      windowsRef.current.visible = showWindows;
    }
  });

  // Create windows
  const windows = useMemo(() => {
    const windowCount = Math.floor(baseHeight * 10);
    return Array(windowCount).fill(null).map((_, i) => ({
      position: [0, (i / windowCount - 0.5) * baseHeight * 0.8, width * 0.5 + 0.01] as [number, number, number],
      key: i,
    }));
  }, [baseHeight, width]);

  return (
    <group position={position}>
      {/* Building core - fixed at ground level */}
      <mesh ref={buildingRef} material={buildingMaterial}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      
      {/* Glow effect */}
      <mesh ref={glowRef} material={glowMaterial} position={[0, baseHeight / 2, 0]}>
        <boxGeometry args={[width * 1.1, baseHeight * 1.1, width * 1.1]} />
      </mesh>
      
      {/* Windows */}
      <group ref={windowsRef}>
        {windows.map((window) => (
          <mesh key={window.key} position={window.position} material={windowMaterial}>
            <boxGeometry args={[0.05, 0.05, 0.01]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function NeonSkylineVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#000000',
}: VisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const textureData = useVisualizerTexture();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const freqData = safeAudioData.frequency || Array(256).fill(0);
  
  // Smoothing ref
  const smoothedBass = useRef(0);

  const buildings = useMemo(() => {
    return Array(30).fill(null).map((_, i) => ({
      position: [(i / 29) * 12 - 6, 0, 0], // Keep Z at 0 for horizontal line
      baseHeight: 0.5 + Math.random() * 1.5,
      width: 0.15 + Math.random() * 0.2,
      index: i,
    }));
  }, []);

  useFrame(() => {
    // Calculate bass per-frame
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += freqData[i] || 0;
    const rawBass = Math.min(sum / 86 / 255 * 3, 1.0);
    
    // Asymmetric smoothing
    const factor = rawBass > smoothedBass.current ? 0.5 : 0.2;
    smoothedBass.current += (rawBass - smoothedBass.current) * factor;
    
    if (groupRef.current) {
      // Keep horizontal - no movement, no breathing effect
      groupRef.current.position.y = -1;
      groupRef.current.scale.setScalar(1);
    }
  });

  return (
    <>
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 10, 5]} intensity={0.3} />
      <Environment preset="night" />
      
      {/* Fixed horizontal skyline group */}
      <group ref={groupRef} position={[0, -1, 0]}>
        {buildings.map((building, i) => (
          <NeonBuilding
            key={i}
            position={building.position}
            baseHeight={building.baseHeight}
            width={building.width}
            index={building.index}
            audioData={audioData}
            textureData={textureData}
          />
        ))}
        
        <Sparkles
          count={200}
          scale={[12, 2, 2]} // Flatter sparkle area for horizontal layout
          size={1 + smoothedBass.current * 2}
          speed={0.3 + smoothedBass.current}
          opacity={0.2 + smoothedBass.current * 0.3}
          color={textureData.colors.primary}
        />
      </group>

    </>
  );
}
