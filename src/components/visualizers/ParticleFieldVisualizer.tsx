import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Points } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture } from "@/hooks/useVisualizerTexture";

export default function ParticleFieldVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#000000',
}: VisualizerProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const textureData = useVisualizerTexture();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const freqData = safeAudioData.frequency || Array(256).fill(0);
  
  const audioIntensity = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += freqData[i] || 0;
    return Math.min(sum / 256 / 255, 1.0);
  }, [freqData]);

  // Create particle positions and initial properties
  const [positions, colors, sizes] = useMemo(() => {
    const particleCount = 2000;
    const posArray = new Float32Array(particleCount * 3);
    const colorArray = new Float32Array(particleCount * 3);
    const sizeArray = new Float32Array(particleCount);
    
    const color = new THREE.Color(textureData.colors?.primary || '#ffffff');
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Random positions in a large space
      posArray[i3] = (Math.random() - 0.5) * 20;
      posArray[i3 + 1] = (Math.random() - 0.5) * 20;
      posArray[i3 + 2] = (Math.random() - 0.5) * 20;
      
      // Color variations
      const intensity = Math.random();
      colorArray[i3] = color.r * (0.5 + intensity * 0.5);
      colorArray[i3 + 1] = color.g * (0.5 + intensity * 0.5);
      colorArray[i3 + 2] = color.b * (0.5 + intensity * 0.5);
      
      // Random sizes
      sizeArray[i] = Math.random() * 3 + 1;
    }
    
    return [posArray, colorArray, sizeArray];
  }, [textureData.colors?.primary, textureData.textureVersion]);

  const particleMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.05,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
  }, []);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      const t = clock.getElapsedTime();
      const positions = pointsRef.current.geometry.attributes.position;
      const colors = pointsRef.current.geometry.attributes.color;
      const posArray = positions.array as Float32Array;
      const colorArray = colors.array as Float32Array;
      
      const baseColor = new THREE.Color(textureData.colors?.primary || '#ffffff');
      
      for (let i = 0; i < posArray.length; i += 3) {
        const x = posArray[i];
        const y = posArray[i + 1];
        const z = posArray[i + 2];
        
        // Move particles towards camera with audio influence
        const speed = 0.02 + audioIntensity * 0.08;
        posArray[i + 2] += speed;
        
        // Reset particles that have moved too far
        if (posArray[i + 2] > 10) {
          posArray[i + 2] = -10;
          posArray[i] = (Math.random() - 0.5) * 20;
          posArray[i + 1] = (Math.random() - 0.5) * 20;
        }
        
        // Update colors based on audio and distance
        const distance = Math.sqrt(x * x + y * y + z * z);
        const intensity = Math.min(1, audioIntensity + 0.3 / (1 + distance * 0.1));
        
        const i3 = (i / 3) * 3;
        colorArray[i3] = baseColor.r * intensity;
        colorArray[i3 + 1] = baseColor.g * intensity;
        colorArray[i3 + 2] = baseColor.b * intensity;
      }
      
      positions.needsUpdate = true;
      colors.needsUpdate = true;
      
      // Rotate the entire field
      pointsRef.current.rotation.y = t * 0.1;
      
      // Update material size based on audio
      (pointsRef.current.material as THREE.PointsMaterial).size = 0.05 + audioIntensity * 0.1;
    }
  });

  return (
    <>
      <ambientLight intensity={0.1} />
      <Environment preset="night" />
      
      <Points ref={pointsRef} material={particleMaterial}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={colors.length / 3}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
      </Points>
    </>
  );
}