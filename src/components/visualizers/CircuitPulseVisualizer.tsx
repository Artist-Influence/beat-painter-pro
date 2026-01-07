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
  const beatStrength = safeAudioData.beatStrength || 0;
  
  // Smoothing refs
  const smoothedIntensity = useRef(0);
  const smoothedBeat = useRef(0);

  const pathMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(textureData.colors?.primary || '#00ffff'),
      transparent: false,
      opacity: 1.0,
      emissive: new THREE.Color(textureData.colors?.primary || '#00ffff'),
      emissiveIntensity: 0.1,
    });
  }, [textureData.colors?.primary, textureData.textureVersion]);

  const pulseMaterial = useMemo(() => {
    return createVisualizerMaterial(textureData.colors?.secondary || '#ffffff', textureData, {
      emissiveIntensity: 1,
      transparent: false,
      opacity: 1.0,
    });
  }, [textureData.textureVersion, textureData.colors?.secondary]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    
    // Calculate audio per-frame
    let sum = 0;
    for (let i = 50; i < 150; i++) sum += freqData[i] || 0;
    const rawIntensity = Math.min(sum / 100 / 255 * 2.5, 1.5);
    const rawBeat = Math.max(beatStrength, rawIntensity * 0.6);
    
    // ASYMMETRIC smoothing
    const attackLerp = 0.5;
    const decayLerp = 0.1;
    const lerpVal = (current: number, target: number) => {
      const factor = target > current ? attackLerp : decayLerp;
      return current + (target - current) * factor;
    };
    
    smoothedIntensity.current = lerpVal(smoothedIntensity.current, rawIntensity);
    smoothedBeat.current = lerpVal(smoothedBeat.current, rawBeat);
    
    const pathIntensity = smoothedIntensity.current;
    const beat = smoothedBeat.current;
    
    // Audio threshold check - completely still when silent
    const audioThreshold = 0.02;
    const hasAudio = pathIntensity > audioThreshold;
    
    // Beat pop
    const beatPop = beat > 0.4 ? 1 + (beat - 0.4) * 0.8 : 1;
    
    if (lineRef.current && pathMaterial) {
      // AUDIO-FIRST emissive (dim when silent)
      pathMaterial.emissiveIntensity = hasAudio ? (0.3 + pathIntensity * 3 + beat * 2) : 0.1;
    }
    
    if (pulsesRef.current) {
      pulsesRef.current.children.forEach((pulse, i) => {
        if (hasAudio) {
          // POSITION: Audio-driven movement
          const basePos = (i * 2) - 4;
          const audioOffset = pathIntensity * 2;
          pulse.position.x = basePos + audioOffset;
          
          // SCALE: Audio-first with beat pop
          const audioScale = (0.5 + pathIntensity * 1.5) * beatPop;
          pulse.scale.setScalar(audioScale);
        } else {
          // STATIC: Return to evenly spaced positions when silent
          pulse.position.x = (i * 2) - 3;
          pulse.scale.setScalar(0.3);
        }
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
  const beatStrength = safeAudioData.beatStrength || 0;
  
  // Smoothing refs
  const smoothedIntensity = useRef(0);
  const smoothedBeat = useRef(0);

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
      
      // Calculate audio per-frame
      const start = index * 10;
      const end = Math.min(start + 10, 256);
      let sum = 0;
      for (let i = start; i < end; i++) sum += freqData[i] || 0;
      const rawIntensity = Math.min(sum / 10 / 255, 1.5);
      const rawBeat = Math.max(beatStrength, rawIntensity * 0.6);
      
      // ASYMMETRIC smoothing
      const attackLerp = 0.5;
      const decayLerp = 0.1;
      const lerpVal = (current: number, target: number) => {
        const factor = target > current ? attackLerp : decayLerp;
        return current + (target - current) * factor;
      };
      
      smoothedIntensity.current = lerpVal(smoothedIntensity.current, rawIntensity);
      smoothedBeat.current = lerpVal(smoothedBeat.current, rawBeat);
      
      const nodeIntensity = smoothedIntensity.current;
      const beat = smoothedBeat.current;
      
      // Audio threshold check - completely still when silent
      const audioThreshold = 0.02;
      const hasAudio = nodeIntensity > audioThreshold;
      
      // Beat pop
      const beatPop = beat > 0.4 ? 1 + (beat - 0.4) * 0.8 : 1;
      
      // SCALE: Returns to default when silent
      const scale = hasAudio ? (0.8 + nodeIntensity * 1.2) * beatPop : 0.8;
      nodeRef.current.scale.setScalar(scale);
      
      nodeRef.current.position.copy(new THREE.Vector3(position[0], position[1], position[2]));
      
      if (coreRef.current && nodeMaterial) {
        // EMISSIVE: Dim when silent
        nodeMaterial.emissiveIntensity = hasAudio ? (0.5 + nodeIntensity * 3 + beat * 2) : 0.3;
      }
      
      if (ringRef.current) {
        // ROTATION: Only when audio is present (frozen when silent)
        if (hasAudio) {
          ringRef.current.rotation.z += nodeIntensity * 0.1;
        }
        const ringScale = hasAudio ? (1 + nodeIntensity * 0.5) * beatPop : 1;
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
          speed={0}
          opacity={0.3}
          color={textureData.colors?.primary || "#00ffff"}
        />
      </group>
    </>
  );
}