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
      
      // Stroboscopic effect - triggers alpha brainwaves
      const strobe = Math.sin(t * 30 + index * 2) > 0.5 ? 1 : 0;
      materialRef.current.emissiveIntensity = strobe * (0.5 + bass * 2);
      
      // Z-position creates infinite tunnel illusion
      const z = ((t * 5 + index * 2) % 20) - 10;
      meshRef.current.position.z = z;
      
      // Scale based on position for perspective
      const scale = 1 + Math.abs(z) * 0.1 + bass * 0.5;
      meshRef.current.scale.setScalar(scale);
      
      // Rotation creates hypnotic spiral
      meshRef.current.rotation.z = t * 2 + index * 0.5 + highs * 3;
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
  }, [textureData.textureVersion, colors[index % 3]]);
  
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
      // Tunnel rotation for disorientation effect
      tunnelRef.current.rotation.z = t * 0.5 + mids * 2;
    }
    
    if (cameraRef.current) {
      // Camera shake on bass hits - physical impact simulation
      if (bass > 0.7) {
        camera.position.x = (Math.random() - 0.5) * bass * 0.2;
        camera.position.y = (Math.random() - 0.5) * bass * 0.2;
      } else {
        camera.position.x *= 0.9;
        camera.position.y *= 0.9;
      }
      
      // Forward movement illusion
      camera.position.z = 5 + Math.sin(t) * 2;
    }
    
    // Update beam opacity
    if (beamMaterialRef.current) {
      beamMaterialRef.current.opacity = 0.3 + bass * 0.5;
    }
    
    // Update flash opacity
    if (flashMaterialRef.current) {
      flashMaterialRef.current.opacity = Math.max(0, bass - 0.8);
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
  }, [textureData.colors?.primary]);

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
      
      {/* Strobe flashes */}
      {bass > 0.8 && (
        <mesh position={[0, 0, -5]} material={flashMaterial}>
          <planeGeometry args={[20, 20]} />
        </mesh>
      )}
    </>
  );
}