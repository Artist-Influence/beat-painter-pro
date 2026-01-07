import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Trail } from "@react-three/drei";
import * as THREE from "three";
import type { VisualizerProps } from "../visualizer";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";
import { useStudioStore } from "@/stores/studioStore";

function Tesseract({ audioData, textureData }) {
  const innerRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const connectionsRef = useRef<THREE.Group>(null);
  const { audioSensitivity } = useStudioStore();
  
  const [innerMaterial, setInnerMaterial] = React.useState<THREE.Material | null>(null);
  const [outerMaterial, setOuterMaterial] = React.useState<THREE.Material | null>(null);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  // Smoothing refs
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  
  useFrame(() => {
    // Calculate audio per-frame
    let bassSum = 0, midsSum = 0, highsSum = 0;
    for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
    for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
    for (let i = 171; i <= 255; i++) highsSum += frequency[i] || 0;
    
    const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
    const rawMids = Math.min((midsSum / 85 / 255) * audioSensitivity.midsMultiplier, 1.0);
    const rawHighs = Math.min((highsSum / 85 / 255) * audioSensitivity.highsMultiplier, 1.0);
    
    // Asymmetric smoothing
    const lerpVal = (current: number, target: number) => {
      const factor = target > current ? 0.5 : 0.2;
      return current + (target - current) * factor;
    };
    
    smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
    smoothedMids.current = lerpVal(smoothedMids.current, rawMids);
    smoothedHighs.current = lerpVal(smoothedHighs.current, rawHighs);
    
    const bass = smoothedBass.current;
    const mids = smoothedMids.current;
    const highs = smoothedHighs.current;
    
    // Audio threshold check
    const audioThreshold = 0.02;
    const hasAudio = bass > audioThreshold || mids > audioThreshold || highs > audioThreshold;
    
    if (innerRef.current && outerRef.current) {
      // Rotation ONLY when audio is present
      if (hasAudio) {
        innerRef.current.rotation.x += bass * 0.15 * audioSensitivity.animationSpeed;
        innerRef.current.rotation.y += bass * 0.1 * audioSensitivity.animationSpeed;
        innerRef.current.rotation.z += mids * 0.08 * audioSensitivity.animationSpeed;
        
        outerRef.current.rotation.x += bass * 0.08 * audioSensitivity.animationSpeed;
        outerRef.current.rotation.y += mids * 0.12 * audioSensitivity.animationSpeed;
        outerRef.current.rotation.z += highs * 0.06 * audioSensitivity.animationSpeed;
      }
      
      // Scale driven by audio (returns to base when silent)
      const shift = 0.6 + bass * 1.5;
      innerRef.current.scale.setScalar(shift);
      
      const portal = 1 + bass * 1.2;
      outerRef.current.scale.setScalar(portal);
      
      // Position proportional to audio
      innerRef.current.position.x = bass * 0.2;
      innerRef.current.position.y = mids * 0.15;
    }
    
    if (connectionsRef.current && hasAudio) {
      connectionsRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh && child.material) {
          const opacity = 0.5 + bass * 1.0;
          (child.material as THREE.Material & { opacity: number }).opacity = Math.min(opacity, 1.0);
        }
      });
    }
  });
  
  const primaryColor = textureData.colors.primary;
  const accentColor = textureData.colors.accent;
  
  useEffect(() => {
    const newInnerMaterial = createVisualizerMaterial(primaryColor, textureData, {
      emissive: primaryColor, emissiveIntensity: 3.0, wireframe: false, metalness: 0.2, roughness: 0.8,
    });
    const newOuterMaterial = createVisualizerMaterial(accentColor, textureData, {
      emissive: accentColor, emissiveIntensity: 2.4, wireframe: true, transparent: true, opacity: 0.7,
    });
    setInnerMaterial(newInnerMaterial);
    setOuterMaterial(newOuterMaterial);
  }, [textureData.textureVersion, primaryColor, accentColor]);
  
  const connections = useMemo(() => {
    const points = [];
    for (let i = 0; i < 8; i++) {
      const x = (i & 1) ? 1 : -1;
      const y = (i & 2) ? 1 : -1;
      const z = (i & 4) ? 1 : -1;
      points.push(new THREE.Vector3(x, y, z));
    }
    return points;
  }, []);
  
  return (
    <group>
      {innerMaterial && <mesh ref={innerRef} material={innerMaterial}><boxGeometry args={[1, 1, 1]} /></mesh>}
      {outerMaterial && <mesh ref={outerRef} material={outerMaterial}><boxGeometry args={[2, 2, 2]} /></mesh>}
      <group ref={connectionsRef}>
        {connections.map((point, i) => (
          <mesh key={i} position={point}>
            <cylinderGeometry args={[0.02, 0.02, 2]} />
            <meshStandardMaterial color={primaryColor} emissive={primaryColor} emissiveIntensity={2.4} transparent opacity={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function HypercubePortalVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080, height = 1080, zoomLevel = 1, backgroundColor = '#FFFFFF',
}: VisualizerProps) {
  const portalRef = useRef<THREE.Group>(null);
  const textureData = useVisualizerTexture();
  const { audioSensitivity } = useStudioStore();
  const [ringMaterials, setRingMaterials] = React.useState<THREE.Material[]>([]);
  
  useEffect(() => {
    const materials = [1, 1.5, 2, 2.5, 3].map((_, i) => 
      createVisualizerMaterial(textureData.colors.accent, textureData, {
        emissive: textureData.colors.accent, emissiveIntensity: 1.8, transparent: true, opacity: 0.4 - i * 0.05, metalness: 0.9, roughness: 0.1,
      })
    );
    setRingMaterials(materials);
  }, [textureData.textureVersion, textureData.colors.accent]);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);

  useFrame(() => {
    let bassSum = 0, midsSum = 0;
    for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
    for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
    const rawBass = Math.min((bassSum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
    const rawMids = Math.min((midsSum / 85 / 255) * audioSensitivity.midsMultiplier, 1.0);
    
    const lerpVal = (c: number, t: number) => c + (t - c) * (t > c ? 0.5 : 0.2);
    smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
    smoothedMids.current = lerpVal(smoothedMids.current, rawMids);
    
    const bass = smoothedBass.current;
    const mids = smoothedMids.current;
    const hasAudio = bass > 0.02 || mids > 0.02;

    if (portalRef.current) {
      const spinSpeed = audioSensitivity.spinSpeed ?? 0;
      portalRef.current.rotation.y += spinSpeed * 0.05;
      if (hasAudio) portalRef.current.rotation.y += bass * 0.1 * audioSensitivity.animationSpeed;
      portalRef.current.rotation.x = bass * 0.3;
      const scale = 1 + bass * 0.5;
      portalRef.current.scale.setScalar(scale);
      portalRef.current.position.y = bass * 0.3;
    }
  });
  
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <Environment preset="city" />
      <group ref={portalRef}>
        <Tesseract audioData={audioData} textureData={textureData} />
        {ringMaterials.length > 0 && [1, 1.5, 2, 2.5, 3].map((scale, i) => (
          <mesh key={i} scale={scale} material={ringMaterials[i]}><torusGeometry args={[1, 0.04, 16, 100]} /></mesh>
        ))}
      </group>
    </>
  );
}
