import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";

function RibbonMesh({ position, ribbonIndex, audioData, textureData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const freqData = safeAudioData.frequency || Array(256).fill(0);
  
  // Get audio intensity for this ribbon
  const ribbonFreq = useMemo(() => {
    const start = ribbonIndex * 30;
    const end = Math.min(start + 30, 256);
    let sum = 0;
    for (let i = start; i < end; i++) sum += freqData[i] || 0;
    return Math.min(sum / 30 / 255, 1.0);
  }, [freqData, ribbonIndex]);

  // Create flowing ribbon geometry
  const geometry = useMemo(() => {
    const segments = 50;
    const width = 0.2;
    const vertices = [];
    const indices = [];
    
    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= 1; j++) {
        const x = (i / segments) * 6 - 3;
        const y = (j - 0.5) * width;
        const z = 0;
        vertices.push(x, y, z);
      }
    }
    
    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
    
    const geom = new THREE.BufferGeometry();
    geom.setIndex(indices);
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.computeVertexNormals();
    
    return geom;
  }, []);

  // Create material
  const material = useMemo(() => {
    const mat = createVisualizerMaterial(textureData.colors?.primary || '#ffffff', textureData, {
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.3 + ribbonIndex * 0.15,
    });
    mat.side = THREE.DoubleSide;
    materialRef.current = mat;
    return mat;
  }, [textureData.textureVersion, textureData.colors?.primary, ribbonIndex]);

  useFrame(({ clock }) => {
    if (meshRef.current && materialRef.current) {
      const t = clock.getElapsedTime();
      
      // Update ribbon wave positions - keep horizontal flow
      const positions = meshRef.current.geometry.attributes.position;
      const array = positions.array as Float32Array;
      
      for (let i = 0; i < array.length; i += 3) {
        const x = array[i];
        const baseY = array[i + 1];
        const audioValue = Math.sin(t * 2 + x * 0.5 + ribbonIndex) * 0.5 + 0.5;
        const offset = (audioValue + ribbonFreq) * 0.2 * (1 + ribbonIndex * 0.05); // Even smaller amplitude
        
        // Keep ribbons flowing horizontally with minimal vertical movement
        array[i + 2] = Math.sin(t + x * 0.3) * offset;
      }
      
      positions.needsUpdate = true;
      
      // Update material properties
      materialRef.current.emissiveIntensity = 0.3 + ribbonFreq * 2;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} position={position} />
  );
}

export default function WaveRibbonsVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#000000',
}: VisualizerProps) {
  const textureData = useVisualizerTexture();
  
  const ribbons = useMemo(() => [
    { position: [0, 0.4, 0], index: 0 },
    { position: [0, 0.2, 0], index: 1 },
    { position: [0, 0, 0], index: 2 },
    { position: [0, -0.2, 0], index: 3 },
    { position: [0, -0.4, 0], index: 4 },
  ], []);

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={0.3} />
      <Environment preset="night" />
      
      <group>
        {ribbons.map((ribbon) => (
          <RibbonMesh
            key={ribbon.index}
            position={ribbon.position}
            ribbonIndex={ribbon.index}
            audioData={audioData}
            textureData={textureData}
          />
        ))}
      </group>
    </>
  );
}