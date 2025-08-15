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
  
  // Store materials to update them when texture changes
  const [innerMaterial, setInnerMaterial] = React.useState<THREE.Material | null>(null);
  const [outerMaterial, setOuterMaterial] = React.useState<THREE.Material | null>(null);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return Math.min((sum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
  }, [frequency, audioSensitivity.bassMultiplier]);
  
  const mids = useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
    return Math.min((sum / 85 / 255) * audioSensitivity.midsMultiplier, 1.0);
  }, [frequency, audioSensitivity.midsMultiplier]);
  
  const highs = useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
    return Math.min((sum / 85 / 255) * audioSensitivity.highsMultiplier, 1.0);
  }, [frequency, audioSensitivity.highsMultiplier]);
  
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const animSpeed = audioSensitivity.animationSpeed;
    
    if (innerRef.current && outerRef.current) {
      // Balanced 4D rotation with strong bass response
      innerRef.current.rotation.x = t * 0.8 * animSpeed + bass * 3.0;
      innerRef.current.rotation.y = t * 0.6 * animSpeed + bass * 2.0 + mids * 0.8;
      innerRef.current.rotation.z = t * 0.4 * animSpeed + bass * 1.5 + highs * 0.5;
      
      outerRef.current.rotation.x = -t * 0.5 * animSpeed + bass * 1.8;
      outerRef.current.rotation.y = -t * 0.7 * animSpeed + bass * 2.5 + mids * 0.6;
      outerRef.current.rotation.z = -t * 0.3 * animSpeed + bass * 1.2 + highs * 0.4;
      
      // Strong bass dimensional shifting with subtle baseline
      const shift = 0.6 + Math.sin(t * 3 * animSpeed) * 0.3 + bass * 1.5 + mids * 0.3;
      innerRef.current.scale.setScalar(shift);
      
      // Strong bass portal pulsing 
      const portal = 1 + Math.sin(t * 8 * animSpeed) * 0.3 + bass * 1.2 + highs * 0.2;
      outerRef.current.scale.setScalar(portal);
      
      // Minimal position movement
      innerRef.current.position.x = Math.sin(t * 2 * animSpeed) * bass * 0.2;
      innerRef.current.position.y = Math.cos(t * 1.8 * animSpeed) * bass * 0.15;
    }
    
    if (connectionsRef.current) {
      // Balanced connecting lines with strong bass response
      connectionsRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh && child.material) {
          const opacity = 0.5 + Math.sin(t * 4 * animSpeed + i) * 0.3 + bass * 1.0 + mids * 0.2;
          (child.material as THREE.Material & { opacity: number }).opacity = Math.min(opacity, 1.0);
        }
      });
    }
  });
  
  const primaryColor = textureData.colors.primary;
  const accentColor = textureData.colors.accent;
  
  // Update materials when texture changes
  useEffect(() => {
    const newInnerMaterial = createVisualizerMaterial(
      primaryColor,
      textureData,
      {
        emissive: primaryColor,
        emissiveIntensity: 3.0,
        wireframe: false, // Changed to show texture better
        metalness: 0.2,
        roughness: 0.8,
      }
    );
    
    const newOuterMaterial = createVisualizerMaterial(
      accentColor,
      textureData,
      {
        emissive: accentColor,
        emissiveIntensity: 2.4,
        wireframe: true,
        transparent: true,
        opacity: 0.7,
      }
    );
    
    setInnerMaterial(newInnerMaterial);
    setOuterMaterial(newOuterMaterial);
  }, [textureData.textureVersion, primaryColor, accentColor]);
  
  // Create vertices for hypercube connections
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
      {/* Inner cube - represents higher dimension */}
      {innerMaterial && (
        <mesh ref={innerRef} material={innerMaterial}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      )}
      
      {/* Outer cube - current dimension */}
      {outerMaterial && (
        <mesh ref={outerRef} material={outerMaterial}>
          <boxGeometry args={[2, 2, 2]} />
        </mesh>
      )}
      
      {/* Dimensional connections - make them more visible */}
      <group ref={connectionsRef}>
        {connections.map((point, i) => (
          <mesh 
            key={i} 
            position={point}
          >
            <cylinderGeometry args={[0.02, 0.02, 2]} />
            <meshStandardMaterial
              color={primaryColor}
              emissive={primaryColor}
              emissiveIntensity={2.4}
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default function HypercubePortalVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#FFFFFF',
}: VisualizerProps) {
  const portalRef = useRef<THREE.Group>(null);
  const textureData = useVisualizerTexture();
  const { audioSensitivity } = useStudioStore();
  
  // Create portal ring materials that update with texture
  const [ringMaterials, setRingMaterials] = React.useState<THREE.Material[]>([]);
  
  useEffect(() => {
    const materials = [1, 1.5, 2, 2.5, 3].map((_, i) => 
      createVisualizerMaterial(
        textureData.colors.accent,
        textureData,
        {
          emissive: textureData.colors.accent,
          emissiveIntensity: 1.8,
          transparent: true,
          opacity: 0.4 - i * 0.05,
          metalness: 0.9,
          roughness: 0.1,
        }
      )
    );
    setRingMaterials(materials);
  }, [textureData.textureVersion, textureData.colors.accent]);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return Math.min((sum / 86 / 255) * audioSensitivity.bassMultiplier, 1.0);
  }, [frequency, audioSensitivity.bassMultiplier]);
  
  const mids = useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
    return Math.min((sum / 85 / 255) * audioSensitivity.midsMultiplier, 1.0);
  }, [frequency, audioSensitivity.midsMultiplier]);

  useFrame(({ clock }) => {
    if (portalRef.current) {
      const t = clock.getElapsedTime();
      const animSpeed = audioSensitivity.animationSpeed;
      // Balanced portal rotation with strong bass response
      portalRef.current.rotation.y = t * (0.4 + bass * 1.5 + mids * 0.3) * animSpeed;
      portalRef.current.rotation.x = Math.sin(t * 1.5 * animSpeed) * bass * 0.3;
      
      // Strong bass scaling with subtle baseline
      const scale = 1 + Math.sin(t * 3 * animSpeed) * 0.08 + bass * 0.5;
      portalRef.current.scale.setScalar(scale);
      
      // Minimal position movement
      portalRef.current.position.y = Math.sin(t * 2 * animSpeed) * bass * 0.3;
    }
  });
  
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <Environment preset="city" />
      
      <group ref={portalRef}>
        <Tesseract audioData={audioData} textureData={textureData} />
        
        {/* Portal rings - create tunnel illusion */}
        {ringMaterials.length > 0 && [1, 1.5, 2, 2.5, 3].map((scale, i) => (
          <mesh 
            key={i} 
            scale={scale}
            material={ringMaterials[i]}
          >
            <torusGeometry args={[1, 0.04, 16, 100]} />
          </mesh>
        ))}
      </group>
    </>
  );
}