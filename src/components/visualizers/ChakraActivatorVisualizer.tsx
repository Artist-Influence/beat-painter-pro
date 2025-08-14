import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";

function ChakraVortex({ position, color, frequency, index, audioData, textureData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const freqData = safeAudioData.frequency || Array(256).fill(0);
  
  // Map chakra to specific frequency range
  const chakraFreq = useMemo(() => {
    const start = index * 32;
    const end = Math.min(start + 32, 256);
    let sum = 0;
    for (let i = start; i < end; i++) sum += freqData[i] || 0;
    return Math.min(sum / 32 / 255, 1.0);
  }, [freqData, index]);

  // Create material that updates with texture changes
  const material = useMemo(() => {
    const mat = createVisualizerMaterial(color, textureData, {
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.7,
      metalness: 0.5,
      roughness: 0.2,
    });
    materialRef.current = mat;
    return mat;
  }, [textureData.textureVersion, color, textureData.texture]);
  
  useFrame(({ clock }) => {
    if (meshRef.current && materialRef.current) {
      const t = clock.getElapsedTime();
      
      // Spinning at chakra-specific frequency
      meshRef.current.rotation.z = t * (frequency / 100) + chakraFreq * 5;
      
      // Pulsing with audio energy
      const pulse = 1 + chakraFreq * 0.5 + Math.sin(t * frequency / 50) * 0.1;
      meshRef.current.scale.setScalar(pulse);

      // Update emissive intensity based on audio
      materialRef.current.emissiveIntensity = 0.5 + chakraFreq * 2;
    }
    
    if (particlesRef.current) {
      particlesRef.current.rotation.z = -clock.getElapsedTime() * 0.5;
    }
  });
  
  // Create spiral particle system
  const particlePositions = useMemo(() => {
    const positions = new Float32Array(300);
    for (let i = 0; i < 100; i++) {
      const angle = i * 0.1;
      const radius = i * 0.005;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    }
    return positions;
  }, []);

  // Particle material with texture colors
  const particleMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.02,
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
  }, [color, chakraFreq, textureData.textureVersion]);
  
  return (
    <group position={position}>
      {/* Chakra vortex */}
      <mesh ref={meshRef} material={material}>
        <coneGeometry args={[0.3, 0.5, 32]} />
      </mesh>
      
      {/* Energy particles */}
      <points ref={particlesRef} material={particleMaterial}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={100}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
      </points>
    </group>
  );
}

export default function ChakraActivatorVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#00FF00',
}: VisualizerProps) {
  const spineRef = useRef<THREE.Group>(null);
  const textureData = useVisualizerTexture();
  
  // 7 Chakras with frequencies and colors  
  const chakras = useMemo(() => {
    return [
      { position: [0, -1.5, 0], color: '#ffffff', frequency: 396 }, // Root - Liberation
      { position: [0, -1, 0], color: '#ffffff', frequency: 417 },   // Sacral - Change
      { position: [0, -0.5, 0], color: '#ffffff', frequency: 528 }, // Solar - Transformation
      { position: [0, 0, 0], color: '#ffffff', frequency: 639 },    // Heart - Connection
      { position: [0, 0.5, 0], color: '#ffffff', frequency: 741 },  // Throat - Expression
      { position: [0, 1, 0], color: '#ffffff', frequency: 852 },    // Third Eye - Intuition
      { position: [0, 1.5, 0], color: '#ffffff', frequency: 963 }   // Crown - Enlightenment
    ];
  }, []);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  const amplitude = safeAudioData.amplitude || 0;

  // Create connecting beam material
  const beamMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(textureData.colors?.primary || '#ffffff'),
      transparent: true,
      opacity: 0.3,
    });
  }, [textureData.colors?.primary, textureData.textureVersion]);
  
  useFrame(({ clock }) => {
    if (spineRef.current) {
      const t = clock.getElapsedTime();
      
      // Kundalini serpent movement
      spineRef.current.rotation.y = Math.sin(t * 0.5) * 0.2 + amplitude * 0.5;
      
      // Rising energy effect
      const rise = Math.sin(t * 0.3) * 0.1;
      spineRef.current.position.y = rise;
    }
  });
  
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <Environment preset="city" />
      
      <group ref={spineRef}>
        {/* Chakra vortexes */}
        {chakras.map((chakra, i) => (
          <ChakraVortex
            key={i}
            position={chakra.position}
            color={chakra.color}
            frequency={chakra.frequency}
            index={i}
            audioData={audioData}
            textureData={textureData}
          />
        ))}
        
        {/* Connecting energy channel */}
        <mesh material={beamMaterial}>
          <cylinderGeometry args={[0.02, 0.02, 3]} />
        </mesh>
        
        {/* Aura field */}
        <Sparkles
          count={200}
          scale={[3, 4, 3]}
          size={2}
          speed={1}
          opacity={0.4}
          color={textureData.colors?.primary || "#ffffff"}
        />
      </group>
    </>
  );
}