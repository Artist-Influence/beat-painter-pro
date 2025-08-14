import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";

function CircuitPath({ position, rotation, pulseSpeed, audioData, textureData }) {
  const lineRef = useRef<THREE.Mesh>(null);
  const pulsesRef = useRef<THREE.Group>(null);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const freqData = safeAudioData.frequency || Array(256).fill(0);
  
  const pathIntensity = useMemo(() => {
    let sum = 0;
    for (let i = 50; i < 150; i++) sum += freqData[i] || 0;
    return Math.min(sum / 100 / 255, 1.0);
  }, [freqData]);

  const pathMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(textureData.colors?.primary || '#00ffff'),
      transparent: true,
      opacity: 0.3,
      emissive: new THREE.Color(textureData.colors?.primary || '#00ffff'),
      emissiveIntensity: 0.1,
    });
  }, [textureData.colors?.primary, textureData.textureVersion]);

  const pulseMaterial = useMemo(() => {
    return createVisualizerMaterial(textureData.colors?.secondary || '#ffffff', textureData, {
      emissiveIntensity: 1,
      transparent: true,
      opacity: 0.9,
    });
  }, [textureData.textureVersion, textureData.colors?.secondary]);

  useFrame(({ clock }) => {
    if (lineRef.current && pathMaterial) {
      pathMaterial.emissiveIntensity = 0.1 + pathIntensity * 0.5;
    }
    
    if (pulsesRef.current) {
      const t = clock.getElapsedTime();
      
      pulsesRef.current.children.forEach((pulse, i) => {
        const x = ((t * pulseSpeed + i * 2) % 8) - 4;
        pulse.position.x = x;
        
        // Fade pulse at edges
        const edgeDistance = Math.min(Math.abs(x + 4), Math.abs(x - 4));
        pulse.scale.setScalar((edgeDistance / 4) * (0.5 + pathIntensity));
      });
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Circuit path */}
      <mesh ref={lineRef} material={pathMaterial}>
        <boxGeometry args={[8, 0.02, 0.02]} />
      </mesh>
      
      {/* Moving pulses */}
      <group ref={pulsesRef}>
        {Array(4).fill(null).map((_, i) => (
          <mesh key={i} material={pulseMaterial}>
            <sphereGeometry args={[0.05, 16, 16]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function CircuitNode({ position, index, audioData, textureData }) {
  const nodeRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const freqData = safeAudioData.frequency || Array(256).fill(0);
  
  const nodeIntensity = useMemo(() => {
    const start = index * 10;
    const end = Math.min(start + 10, 256);
    let sum = 0;
    for (let i = start; i < end; i++) sum += freqData[i] || 0;
    return Math.min(sum / 10 / 255, 1.0);
  }, [freqData, index]);

  const nodeMaterial = useMemo(() => {
    return createVisualizerMaterial(textureData.colors?.primary || '#ffffff', textureData, {
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8,
    });
  }, [textureData.textureVersion, textureData.colors?.primary]);

  const ringMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(textureData.colors?.primary || '#ffffff'),
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
  }, [textureData.colors?.primary, textureData.textureVersion]);

  useFrame(({ clock }) => {
    if (nodeRef.current) {
      const t = clock.getElapsedTime();
      const scale = 0.8 + nodeIntensity * 0.4;
      nodeRef.current.scale.setScalar(scale);
      
      // Keep node position stable - no Y movement for horizontal layout
      nodeRef.current.position.copy(new THREE.Vector3(position[0], position[1], position[2]));
      
      if (coreRef.current && nodeMaterial) {
        nodeMaterial.emissiveIntensity = 0.5 + nodeIntensity * 2;
      }
      
      if (ringRef.current) {
        ringRef.current.rotation.z = t + index;
        const ringScale = 1 + Math.sin(t * 2 + index) * 0.1; // Reduced scale animation
        ringRef.current.scale.setScalar(ringScale);
      }
    }
  });

  return (
    <group ref={nodeRef} position={position}>
      {/* Core */}
      <mesh ref={coreRef} material={nodeMaterial}>
        <sphereGeometry args={[0.08, 16, 16]} />
      </mesh>
      
      {/* Ring */}
      <mesh ref={ringRef} material={ringMaterial}>
        <ringGeometry args={[0.12, 0.15, 16]} />
      </mesh>
    </group>
  );
}

export default function CircuitPulseVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#000000',
}: VisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const textureData = useVisualizerTexture();
  
  const paths = useMemo(() => [
    { position: [0, 0.5, 0], rotation: [0, 0, 0], speed: 2 },
    { position: [0, 0, 0], rotation: [0, 0, 0], speed: 1.5 },
    { position: [0, -0.5, 0], rotation: [0, 0, 0], speed: 2.5 },
  ], []);

  const nodes = useMemo(() => [
    { position: [-3, 0.5, 0], index: 0 },
    { position: [-1, 0.5, 0], index: 1 },
    { position: [1, 0.5, 0], index: 2 },
    { position: [3, 0.5, 0], index: 3 },
    { position: [-3, 0, 0], index: 4 },
    { position: [-1, 0, 0], index: 5 },
    { position: [1, 0, 0], index: 6 },
    { position: [3, 0, 0], index: 7 },
    { position: [-3, -0.5, 0], index: 8 },
    { position: [-1, -0.5, 0], index: 9 },
    { position: [1, -0.5, 0], index: 10 },
    { position: [3, -0.5, 0], index: 11 },
  ], []);

  return (
    <>
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 5, 5]} intensity={0.3} />
      <Environment preset="night" />
      
      <group ref={groupRef}>
        {/* Circuit paths */}
        {paths.map((path, i) => (
          <CircuitPath
            key={i}
            position={path.position}
            rotation={path.rotation}
            pulseSpeed={path.speed}
            audioData={audioData}
            textureData={textureData}
          />
        ))}
        
        {/* Circuit nodes */}
        {nodes.map((node) => (
          <CircuitNode
            key={node.index}
            position={node.position}
            index={node.index}
            audioData={audioData}
            textureData={textureData}
          />
        ))}
        
        <Sparkles
          count={50}
          scale={[8, 2, 2]}
          size={1}
          speed={0.5}
          opacity={0.3}
          color={textureData.colors?.primary || "#00ffff"}
        />
      </group>
    </>
  );
}