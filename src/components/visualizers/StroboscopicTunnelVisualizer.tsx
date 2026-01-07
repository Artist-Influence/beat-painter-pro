import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from "../visualizer";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";
import { useStudioStore } from "@/stores/studioStore";

function StrobeRing({ distance, index, audioData, textureData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>();
  const { audioSensitivity } = useStudioStore();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  // Smoothing refs
  const smoothedBass = useRef(0);
  const smoothedHighs = useRef(0);
  // Store current Z position
  const currentZ = useRef(distance);
  // Base rotation for position-based rotation
  const baseRotation = useRef(0);
  
  useFrame(() => {
    if (meshRef.current && materialRef.current) {
      // Calculate audio per-frame
      let bassSum = 0, highsSum = 0;
      for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
      for (let i = 171; i <= 255; i++) highsSum += frequency[i] || 0;
      
      const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
      const rawHighs = Math.min((highsSum / 85 / 255) * audioSensitivity.highsMultiplier, 1.0);
      
      // Asymmetric smoothing
      const lerpVal = (current: number, target: number) => {
        const factor = target > current ? 0.5 : 0.2;
        return current + (target - current) * factor;
      };
      
      smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
      smoothedHighs.current = lerpVal(smoothedHighs.current, rawHighs);
      
      const bass = smoothedBass.current;
      const highs = smoothedHighs.current;
      
      // Audio threshold check
      const audioThreshold = 0.02;
      const hasAudio = bass > audioThreshold || highs > audioThreshold;
      
      // Strobe effect driven by audio
      const strobeFreq = hasAudio ? 30 + bass * 40 : 0;
      const strobe = hasAudio && Math.sin(Date.now() * 0.001 * strobeFreq + index * 2) > 0.2 ? 1 : 0;
      materialRef.current.emissiveIntensity = strobe * (1.0 + bass * 3.0);
      
      // Z-position movement ONLY when audio is present
      if (hasAudio) {
        const speed = (6 + bass * 6) * 0.016;
        currentZ.current -= speed;
        if (currentZ.current < -10) currentZ.current = 10;
      }
      meshRef.current.position.z = currentZ.current;
      
      // Scale driven by audio (returns to 1 when silent)
      const scale = 1 + Math.abs(currentZ.current) * 0.1 + bass * 1.2;
      meshRef.current.scale.setScalar(scale);
      
      // Base rotation advances slowly
      const animSpeed = audioSensitivity.animationSpeed;
      baseRotation.current += 0.003 * animSpeed;
      
      // Audio offset for rotation
      const audioOffset = hasAudio ? bass * Math.PI * 0.3 : 0;
      meshRef.current.rotation.z = baseRotation.current + audioOffset;
      
      // Position oscillation proportional to audio
      meshRef.current.position.x = bass * 0.2;
      meshRef.current.position.y = bass * 0.15;
    }
  });
  
  const colors = [
    textureData.colors?.primary || '#ff00ff',
    textureData.colors?.secondary || '#00ffff',
    textureData.colors?.accent || '#ffff00'
  ];
  
  // Create material that updates with texture changes
  const material = useMemo(() => {
    const mat = createVisualizerMaterial(colors[index % 3], textureData, {
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.1,
    });
    materialRef.current = mat;
    return mat;
  }, [textureData.textureVersion, colors[index % 3], textureData.texture]);
  
  return (
    <mesh ref={meshRef} position={[0, 0, distance]} material={material}>
      <torusGeometry args={[1, 0.1, 8, 32]} />
    </mesh>
  );
}

export default function StroboscopicTunnelVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#00FF00',
}: VisualizerProps) {
  const tunnelRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.Group>(null);
  const beamMaterialRef = useRef<THREE.MeshBasicMaterial>();
  const flashMaterialRef = useRef<THREE.MeshBasicMaterial>();
  const textureData = useVisualizerTexture();
  const { audioSensitivity } = useStudioStore();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  // Smoothing refs
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  // Base rotation for position-based rotation
  const tunnelBaseRotation = useRef(0);
  
  useFrame(({ camera }) => {
    // Calculate audio per-frame
    let bassSum = 0, midsSum = 0;
    for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
    for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
    
    const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
    const rawMids = Math.min((midsSum / 85 / 255) * audioSensitivity.midsMultiplier, 1.0);
    
    // Asymmetric smoothing
    const lerpVal = (current: number, target: number) => {
      const factor = target > current ? 0.5 : 0.2;
      return current + (target - current) * factor;
    };
    
    smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
    smoothedMids.current = lerpVal(smoothedMids.current, rawMids);
    
    const bass = smoothedBass.current;
    const mids = smoothedMids.current;
    
    // Audio threshold check
    const audioThreshold = 0.02;
    const hasAudio = bass > audioThreshold || mids > audioThreshold;
    
    if (tunnelRef.current) {
      // Base rotation advances slowly
      const animSpeed = audioSensitivity.animationSpeed;
      tunnelBaseRotation.current += 0.002 * animSpeed;
      
      // Audio offset for rotation
      const audioOffset = hasAudio ? mids * bass * Math.PI * 0.4 : 0;
      tunnelRef.current.rotation.z = tunnelBaseRotation.current + audioOffset;
      
      // Scale driven by audio (returns to 1 when silent)
      const tunnelScale = 1 + bass * 0.4;
      tunnelRef.current.scale.setScalar(tunnelScale);
    }
    
    if (cameraRef.current) {
      // Camera shake ONLY when audio is strong
      if (bass > 0.5) {
        camera.position.x = (Math.random() - 0.5) * bass * 0.6;
        camera.position.y = (Math.random() - 0.5) * bass * 0.6;
      } else {
        camera.position.x *= 0.8;
        camera.position.y *= 0.8;
      }
      
      // Camera Z position driven by audio
      camera.position.z = 6 + bass * 2;
      
      // Camera rotation proportional to audio
      camera.rotation.z = bass * 0.1;
    }
    
    // Beam opacity driven by audio
    if (beamMaterialRef.current) {
      beamMaterialRef.current.opacity = 0.5 + bass * 1.0;
    }
    
    // Flash opacity driven by bass
    if (flashMaterialRef.current) {
      flashMaterialRef.current.opacity = Math.max(0, (bass - 0.4) * 3);
    }
  });

  // Create beam material
  const beamMaterial = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(textureData.colors?.primary || '#ffffff'),
      transparent: true,
      opacity: 0.3,
    });
    beamMaterialRef.current = material;
    return material;
  }, [textureData.colors?.primary, textureData.textureVersion]);

  // Create flash material
  const flashMaterial = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    flashMaterialRef.current = material;
    return material;
  }, []);
  
  return (
    <>
      <ambientLight intensity={0.1} />
      <directionalLight position={[0, 0, -10]} intensity={0.5} />
      <Environment preset="city" />
      
      <group ref={cameraRef}>
        <group ref={tunnelRef}>
          {/* Multiple rings create tunnel */}
          {Array.from({ length: 20 }).map((_, i) => (
            <StrobeRing
              key={i}
              distance={i * -2}
              index={i}
              audioData={audioData}
              textureData={textureData}
            />
          ))}
          
          {/* Center beam - focus point for trance */}
          <mesh material={beamMaterial}>
            <cylinderGeometry args={[0.05, 0.05, 100]} />
          </mesh>
        </group>
      </group>
      
      {/* Enhanced strobe flashes with bass responsiveness */}
      {smoothedBass.current > 0.6 && (
        <mesh position={[0, 0, -5]} material={flashMaterial}>
          <planeGeometry args={[20, 20]} />
        </mesh>
      )}
    </>
  );
}
