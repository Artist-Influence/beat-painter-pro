import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";

function NeonBuilding({ position, baseHeight, width, index, audioData, textureData }) {
  const buildingRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const windowsRef = useRef<THREE.Group>(null);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const freqData = safeAudioData.frequency || Array(256).fill(0);
  
  const buildingFreq = useMemo(() => {
    const start = index * 8;
    const end = Math.min(start + 8, 256);
    let sum = 0;
    for (let i = start; i < end; i++) sum += freqData[i] || 0;
    return Math.min(sum / 8 / 255, 1.0);
  }, [freqData, index]);

  // Get applied texture and colors directly like other visualizers
  const extractedColors = (window as any).extractedColors;
  const appliedTexture = useMemo(() => {
    const at = (window as any).appliedTexture;
    if (!at) return null;
    if (typeof at === "string") {
      const tex = new THREE.TextureLoader().load(at);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }
    return at as THREE.Texture;
  }, []);

  const primaryColor = extractedColors?.primary || '#ffffff';
  const secondaryColor = extractedColors?.secondary || '#ffff00';

  const buildingMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(primaryColor),
      emissive: new THREE.Color(extractedColors?.isNeon ? primaryColor : primaryColor),
      emissiveIntensity: extractedColors?.isNeon ? 2.0 : 1.2,
      metalness: extractedColors?.isMetallic ? 0.9 : 0.7,
      roughness: extractedColors?.isMetallic ? 0.1 : 0.3,
      map: appliedTexture,
      emissiveMap: appliedTexture,
    });
  }, [primaryColor, appliedTexture, extractedColors]);

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

  useFrame(({ clock }) => {
    if (buildingRef.current && buildingMaterial) {
      const t = clock.getElapsedTime();
      const height = baseHeight + buildingFreq * 5.0; // Much more dramatic height response
      const pulse = Math.sin(t * 4 + index * 0.5) * 0.5 + 0.5;
      
      // Much more dramatic audio response for width and depth
      const audioWidth = width * (1 + buildingFreq * 3.0);
      const audioDepth = width * (1 + buildingFreq * 2.5);
      
      // Keep buildings on ground level - no Y movement
      buildingRef.current.scale.set(audioWidth, height, audioDepth);
      buildingRef.current.position.set(0, height / 2, 0);
      buildingMaterial.emissiveIntensity = 1.2 + buildingFreq * 8.0 + pulse * 2.0;
    }
    
    if (glowRef.current && glowMaterial) {
      glowMaterial.opacity = 0.1 + buildingFreq * 0.3;
    }
    
    if (windowsRef.current) {
      const showWindows = buildingFreq > 0.3;
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
      <mesh ref={glowRef} material={glowMaterial}>
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
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const freqData = safeAudioData.frequency || Array(256).fill(0);
  
  const bassIntensity = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += freqData[i] || 0;
    return Math.min(sum / 86 / 255 * 3, 1.0); // Increase sensitivity
  }, [freqData]);

  const buildings = useMemo(() => {
    return Array(30).fill(null).map((_, i) => ({
      position: [(i / 29) * 12 - 6, 0, 0], // Keep Z at 0 for horizontal line
      baseHeight: 0.5 + Math.random() * 1.5,
      width: 0.15 + Math.random() * 0.2,
      index: i,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Keep horizontal - remove vertical movement
      groupRef.current.position.y = 0;
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
            textureData={null}
          />
        ))}
        
        <Sparkles
          count={200}
          scale={[12, 2, 2]} // Flatter sparkle area for horizontal layout
          size={1 + bassIntensity * 2}
          speed={0.3 + bassIntensity}
          opacity={0.2 + bassIntensity * 0.3}
          color={(window as any).extractedColors?.primary || "#ffffff"}
        />
      </group>
    </>
  );
}