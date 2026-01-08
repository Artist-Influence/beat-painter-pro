import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";
import { useStudioStore } from "@/stores/studioStore";

function RibbonMesh({ position, ribbonIndex, audioData, textureData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const freqData = safeAudioData.frequency || Array(256).fill(0);
  const beatStrength = safeAudioData.beatStrength || 0;
  
  // Smoothing refs
  const smoothedFreq = useRef(0);
  const smoothedBeat = useRef(0);
  
  // Frequency range for this ribbon
  const freqStart = ribbonIndex * 30;
  const freqEnd = Math.min(freqStart + 30, 256);

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
      transparent: false,
      opacity: 1.0,
    });
    mat.side = THREE.DoubleSide;
    materialRef.current = mat;
    return mat;
  }, [textureData.textureVersion, textureData.colors?.primary, ribbonIndex]);

  useFrame(() => {
    if (meshRef.current && materialRef.current) {
      // Calculate audio per-frame
      let sum = 0;
      for (let i = freqStart; i < freqEnd; i++) sum += freqData[i] || 0;
      const rawFreq = Math.min(sum / 30 / 255 * 2.5, 1.5);
      const rawBeat = Math.max(beatStrength, rawFreq * 0.6);
      
      // Faster asymmetric smoothing
      const attackLerp = 0.7;
      const decayLerp = 0.25;
      const lerpVal = (current: number, target: number) => {
        const factor = target > current ? attackLerp : decayLerp;
        return current + (target - current) * factor;
      };
      
      smoothedFreq.current = lerpVal(smoothedFreq.current, rawFreq);
      smoothedBeat.current = lerpVal(smoothedBeat.current, rawBeat);
      
      const ribbonFreq = smoothedFreq.current;
      const beat = smoothedBeat.current;
      
      // Audio threshold check
      const audioThreshold = 0.02;
      const hasAudio = ribbonFreq > audioThreshold || beat > audioThreshold;
      
      // Beat pop - lower threshold
      const beatPop = beat > 0.2 ? 1 + (beat - 0.2) * 1.0 : 1;
      
      // Update ribbon wave positions - ONLY when audio present
      const positions = meshRef.current.geometry.attributes.position;
      const array = positions.array as Float32Array;
      
      for (let i = 0; i < array.length; i += 3) {
        const x = array[i];
        // Wave offset ONLY when audio is present
        if (hasAudio) {
          const audioOffset = ribbonFreq * 0.4 * beatPop * Math.sin(x * 2);
          array[i + 2] = audioOffset;
        } else {
          // Return to flat when silent
          array[i + 2] = 0;
        }
      }
      
      positions.needsUpdate = true;
      
      // Material reactivity
      materialRef.current.emissiveIntensity = 0.5 + ribbonFreq * 3 + beat * 2;
      materialRef.current.opacity = 0.4 + ribbonFreq * 0.4 + beat * 0.2;
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
  const groupRef = useRef<THREE.Group>(null);
  const textureData = useVisualizerTexture();
  const { audioSensitivity } = useStudioStore();
  
  const ribbons = useMemo(() => [
    { position: [0, 0.4, 0], index: 0 },
    { position: [0, 0.2, 0], index: 1 },
    { position: [0, 0, 0], index: 2 },
    { position: [0, -0.2, 0], index: 3 },
    { position: [0, -0.4, 0], index: 4 },
  ], []);

  useFrame(() => {
    if (groupRef.current) {
      const spinSpeed = audioSensitivity.spinSpeed ?? 0;
      // Only rotate when spinSpeed > 0
      if (spinSpeed > 0) {
        groupRef.current.rotation.y += spinSpeed * 0.05;
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={0.3} />
      <Environment preset="night" />
      
      <group ref={groupRef}>
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
