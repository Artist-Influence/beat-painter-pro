import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from "../visualizer";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";
import { analyzeAudio } from "@/lib/visualizerUtils";

function StrobeRing({ distance, index, audioData, textureData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  const { bass, highs } = analyzeAudio(frequency);
  
  useFrame(({ clock }) => {
    if (meshRef.current && materialRef.current) {
      const t = clock.getElapsedTime();
      
      // Strong bass-responsive strobing effect
      const bassMultiplier = bass > 0.05 ? bass : 0.05;
      const strobeFreq = 30 + bassMultiplier * 40; // Moderate strobing with bass
      const strobe = Math.sin(t * strobeFreq + index * 2) > 0.2 ? 1 : 0;
      materialRef.current.emissiveIntensity = strobe * (1.0 + bass * 3.0);
      
      // Balanced Z-position movement for tunnel effect
      const speed = 6 + bassMultiplier * 6;
      const z = ((t * speed + index * 2) % 20) - 10;
      meshRef.current.position.z = z;
      
      // Strong bass scale response
      const scale = 1 + Math.abs(z) * 0.1 + bass * 1.2;
      meshRef.current.scale.setScalar(scale);
      
      // Balanced hypnotic spiral rotation
      meshRef.current.rotation.z = t * 3 + index * 0.6 + bass * 6.0;
      
      // Minimal X-Y oscillation
      meshRef.current.position.x = Math.sin(t * 4 + index) * bass * 0.2;
      meshRef.current.position.y = Math.cos(t * 3.5 + index) * bass * 0.15;
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
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  const { bass, mids } = analyzeAudio(frequency);
  
  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    
    if (tunnelRef.current) {
      // Enhanced tunnel rotation with stronger audio response
      const bassMultiplier = bass > 0.05 ? bass : 0.05;
      tunnelRef.current.rotation.z = t * 1.0 + mids * bassMultiplier * 8;
      
      // Add tunnel scaling for breathing effect
      const tunnelScale = 1 + Math.sin(t * 8) * 0.1 + bass * 0.4;
      tunnelRef.current.scale.setScalar(tunnelScale);
    }
    
    if (cameraRef.current) {
      // Enhanced camera shake with stronger response
      const bassMultiplier = bass > 0.05 ? bass : 0.05;
      if (bass > 0.5) {
        camera.position.x = (Math.random() - 0.5) * bass * bassMultiplier * 0.6;
        camera.position.y = (Math.random() - 0.5) * bass * bassMultiplier * 0.6;
      } else {
        camera.position.x *= 0.8;
        camera.position.y *= 0.8;
      }
      
      // Enhanced forward movement with stronger illusion
      camera.position.z = 6 + Math.sin(t * 2) * 3 + bassMultiplier * Math.sin(t * 4) * 2;
      
      // Add camera rotation for more disorienting effect
      camera.rotation.z = Math.sin(t * 3) * bass * 0.1;
    }
    
    // Enhanced beam opacity with stronger response
    if (beamMaterialRef.current) {
      beamMaterialRef.current.opacity = 0.5 + bass * 1.0;
    }
    
    // Enhanced flash opacity with lower threshold
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
      {bass > 0.6 && (
        <mesh position={[0, 0, -5]} material={flashMaterial}>
          <planeGeometry args={[20, 20]} />
        </mesh>
      )}
    </>
  );
}