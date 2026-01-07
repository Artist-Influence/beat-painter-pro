import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";

function DNAStrand({ isTop, audioData, textureData }) {
  const groupRef = useRef<THREE.Group>(null);
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const freqData = safeAudioData.frequency || Array(256).fill(0);
  
  // Smoothing ref
  const smoothedIntensity = useRef(0);
  // Store current phase for each node
  const nodePhases = useRef<number[]>(Array(40).fill(0));

  // Create DNA nodes
  const nodes = useMemo(() => {
    return Array(40).fill(null).map((_, i) => ({
      index: i,
      position: [(i / 40) * 6 - 3, 0, 0] as [number, number, number],
    }));
  }, []);

  const nodeMaterial = useMemo(() => {
    return createVisualizerMaterial(textureData.colors?.primary || '#ffffff', textureData, {
      emissiveIntensity: 0.5,
      transparent: false,
      opacity: 1.0,
    });
  }, [textureData.textureVersion, textureData.colors?.primary]);

  const connectorMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(textureData.colors?.secondary || '#ffffff'),
      transparent: false,
      opacity: 1.0,
    });
  }, [textureData.colors?.secondary, textureData.textureVersion]);

  useFrame(() => {
    if (groupRef.current) {
      // Calculate audio per-frame
      let sum = 0;
      for (let i = 0; i < 128; i++) sum += freqData[i] || 0;
      const rawIntensity = Math.min(sum / 128 / 255, 1.0);
      
      // Asymmetric smoothing
      const factor = rawIntensity > smoothedIntensity.current ? 0.5 : 0.2;
      smoothedIntensity.current += (rawIntensity - smoothedIntensity.current) * factor;
      
      const audioIntensity = smoothedIntensity.current;
      
      // Audio threshold check
      const audioThreshold = 0.02;
      const hasAudio = audioIntensity > audioThreshold;
      
      groupRef.current.children.forEach((child, i) => {
        if (child.userData.type === 'node') {
          const multiplier = isTop ? 1 : -1;
          
          // Phase advances ONLY when audio is present
          if (hasAudio) {
            nodePhases.current[i] += audioIntensity * 0.15;
          }
          
          const phase = nodePhases.current[i] + (i / 40) * Math.PI * 2;
          const audioBoost = 1 + audioIntensity;
          
          // Position driven by audio (returns to base when silent)
          child.position.y = hasAudio ? Math.sin(phase) * 0.4 * multiplier * audioBoost : 0;
          child.position.z = hasAudio ? Math.cos(phase) * 0.2 * multiplier * audioBoost : 0;
          child.scale.setScalar(0.5 + audioIntensity * 1.2);
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node, i) => {
        const nextNode = nodes[i + 1];
        return (
          <group key={i} position={node.position}>
            {/* Node */}
            <mesh userData={{ type: 'node' }} material={nodeMaterial}>
              <sphereGeometry args={[0.05, 16, 16]} />
            </mesh>
            
            {/* Connector to opposite strand */}
            {nextNode && (
              <mesh
                position={[0.075, 0, 0]}
                rotation={[0, 0, Math.PI / 2]}
                material={connectorMaterial}
                userData={{ type: 'connector' }}
              >
                <cylinderGeometry args={[0.01, 0.01, 0.15]} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

export default function DNAHelixVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#000000',
}: VisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const textureData = useVisualizerTexture();
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const freqData = safeAudioData.frequency || Array(256).fill(0);
  
  // Smoothing ref
  const smoothedBass = useRef(0);

  useFrame(() => {
    // Calculate bass per-frame
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += freqData[i] || 0;
    const rawBass = Math.min(sum / 86 / 255, 1.0);
    
    // Asymmetric smoothing
    const factor = rawBass > smoothedBass.current ? 0.5 : 0.2;
    smoothedBass.current += (rawBass - smoothedBass.current) * factor;
    
    if (groupRef.current) {
      // Keep horizontal orientation - no rotation
      groupRef.current.rotation.x = 0;
      groupRef.current.rotation.y = 0;
      groupRef.current.rotation.z = 0;
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <Environment preset="city" />
      
      <group ref={groupRef}>
        <DNAStrand isTop={true} audioData={audioData} textureData={textureData} />
        <DNAStrand isTop={false} audioData={audioData} textureData={textureData} />
        
        <Sparkles
          count={smoothedBass.current > 0.02 ? 100 : 0}
          scale={[6, 2, 2]}
          size={1 + smoothedBass.current * 2}
          speed={smoothedBass.current > 0.02 ? (0.5 + smoothedBass.current) : 0}
          opacity={0.3 + smoothedBass.current * 0.3}
          color={textureData.colors?.primary || "#ffffff"}
        />
      </group>
    </>
  );
}
