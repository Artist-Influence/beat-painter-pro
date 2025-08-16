import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture } from "@/hooks/useVisualizerTexture";
import { useStudioStore } from "@/stores/studioStore";

function LiquidBlob({ position, index, audioData, textureData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const { audioSensitivity } = useStudioStore();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const freqData = safeAudioData.frequency || Array(256).fill(0);
  
  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += freqData[i] || 0;
    return Math.min((sum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
  }, [freqData, audioSensitivity.bassMultiplier]);

  const mids = useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += freqData[i] || 0;
    return Math.min((sum / 85 / 255) * audioSensitivity.midsMultiplier, 1.0);
  }, [freqData, audioSensitivity.midsMultiplier]);

  const highs = useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += freqData[i] || 0;
    return Math.min((sum / 85 / 255) * audioSensitivity.highsMultiplier, 1.0);
  }, [freqData, audioSensitivity.highsMultiplier]);

  const primaryColor = new THREE.Color(textureData.colors.primary);

  useEffect(() => {
    if (materialRef.current) {
      const mat = materialRef.current;
      // Ensure the latest applied visual style texture is used
      mat.map = textureData.texture || null;
      mat.emissiveMap = textureData.texture || null;
      mat.needsUpdate = true;
    }
  }, [textureData.texture, textureData.textureVersion]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      const speed = audioSensitivity.animationSpeed;
      
      // Enhanced spread with preset responsiveness - increased spacing
      const spreadDistance = 8 + bass * 25.0;
      const direction = position[0] > 0 ? 1 : -1;
      const x = position[0] + (direction * spreadDistance);
      const z = position[2] + (Math.sin(t * 0.5 * speed + index) * 3.0 * bass);
      
      meshRef.current.position.set(x, position[1], z);
      
      // Enhanced scaling with preset responsiveness
      const scale = 0.4 + bass * 1.8;
      meshRef.current.scale.setScalar(scale);
      
      // Update material properties for wobble effect
      if (materialRef.current) {
        // Simulate wobble by adjusting the mesh vertices slightly
        const geometry = meshRef.current.geometry as THREE.SphereGeometry;
        if (geometry.attributes.position) {
          const positions = geometry.attributes.position.array as Float32Array;
          const wobbleFactor = 0.1 + bass * 0.4;
          
          for (let i = 0; i < positions.length; i += 3) {
            const vertex = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
            const noise = Math.sin(t * (1.5 + highs * 2.0) + vertex.length() * 10) * wobbleFactor;
            vertex.normalize().multiplyScalar(1 + noise);
            positions[i] = vertex.x;
            positions[i + 1] = vertex.y;
            positions[i + 2] = vertex.z;
          }
          geometry.attributes.position.needsUpdate = true;
        }
        
        materialRef.current.emissiveIntensity = 1.5 + bass * 4.0;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#ffffff"
        roughness={textureData.colors.isMetallic ? 0.1 : 0.3}
        metalness={textureData.colors.isMetallic ? 0.9 : 0.7}
        emissive={primaryColor}
        emissiveIntensity={1.5 + bass * 4.0}
        map={textureData.texture}
        emissiveMap={textureData.texture}
      />
    </mesh>
  );
}

export default function LiquidMetalVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#000000',
}: VisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const textureData = useVisualizerTexture();
  
  const blobs = useMemo(() => [
    { position: [-20, 0, 0], index: 0 },
    { position: [-12, 0, 0], index: 1 },
    { position: [-4, 0, 0], index: 2 },
    { position: [4, 0, 0], index: 3 },
    { position: [12, 0, 0], index: 4 },
    { position: [20, 0, 0], index: 5 },
  ], []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.rotation.y = t * 0.02; // Even slower, subtle rotation
      groupRef.current.position.y = 0;
    }
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <spotLight position={[0, 10, 0]} intensity={1} angle={Math.PI / 4} penumbra={0.3} />
      <Environment preset="warehouse" />
      
      <group ref={groupRef}>
        {blobs.map((blob) => (
          <LiquidBlob
            key={blob.index}
            position={blob.position}
            index={blob.index}
            audioData={audioData}
            textureData={textureData}
          />
        ))}
      </group>

      {/* Full background style overlay */}
      {textureData.texture && (
        <mesh position={[0, 0, -50]}>
          <planeGeometry args={[200, 200]} />
          <meshBasicMaterial map={textureData.texture} toneMapped={false} />
        </mesh>
      )}
    </>
  );
}