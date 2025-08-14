import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Trail } from "@react-three/drei";
import * as THREE from "three";
import type { VisualizerProps } from "../visualizer";
import { useVisualizerTexture, createVisualizerMaterial } from "@/hooks/useVisualizerTexture";

function Tesseract({ audioData, textureData }) {
  const innerRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const connectionsRef = useRef<THREE.Group>(null);
  
  // Store materials to update them when texture changes
  const [innerMaterial, setInnerMaterial] = React.useState<THREE.Material | null>(null);
  const [outerMaterial, setOuterMaterial] = React.useState<THREE.Material | null>(null);
  
  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);
  
  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return Math.min(sum / 86 / 255, 1.0);
  }, [frequency]);
  
  const mids = useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
    return Math.min(sum / 85 / 255, 1.0);
  }, [frequency]);
  
  const highs = useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
    return Math.min(sum / 85 / 255, 1.0);
  }, [frequency]);
  
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    
    if (innerRef.current && outerRef.current) {
      // Enhanced 4D rotation with stronger audio response
      innerRef.current.rotation.x = t * 1.2 + bass * 4.0;
      innerRef.current.rotation.y = t * 0.8 + mids * 3.0;
      innerRef.current.rotation.z = t * 0.6 + highs * 2.5;
      
      outerRef.current.rotation.x = -t * 0.7 + bass * 2.0;
      outerRef.current.rotation.y = -t * 1.0 + mids * 4.0;
      outerRef.current.rotation.z = -t * 0.4 + highs * 3.0;
      
      // Enhanced dimensional shifting with stronger audio response
      const shift = 0.6 + Math.sin(t * 4) * 0.5 + bass * 1.2 + mids * 0.8;
      innerRef.current.scale.setScalar(shift);
      
      // Enhanced portal pulsing effect
      const portal = 1 + Math.sin(t * 15) * (highs * 0.6 + bass * 0.4) + mids * 0.3;
      outerRef.current.scale.setScalar(portal);
      
      // Add position movement for more dynamic effect
      innerRef.current.position.x = Math.sin(t * 3) * bass * 0.3;
      innerRef.current.position.y = Math.cos(t * 2.5) * mids * 0.2;
    }
    
    if (connectionsRef.current) {
      // Enhanced connecting lines with stronger audio response
      connectionsRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh && child.material) {
          const opacity = 0.5 + Math.sin(t * 6 + i) * 0.4 + mids * 0.8 + bass * 0.5;
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
        emissiveIntensity: 1.0,
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
        emissiveIntensity: 0.8,
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
              emissiveIntensity={0.8}
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
  
  // Create portal ring materials that update with texture
  const [ringMaterials, setRingMaterials] = React.useState<THREE.Material[]>([]);
  
  useEffect(() => {
    const materials = [1, 1.5, 2, 2.5, 3].map((_, i) => 
      createVisualizerMaterial(
        textureData.colors.accent,
        textureData,
        {
          emissive: textureData.colors.accent,
          emissiveIntensity: 0.6,
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
    return Math.min(sum / 86 / 255, 1.0);
  }, [frequency]);
  
  const mids = useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
    return Math.min(sum / 85 / 255, 1.0);
  }, [frequency]);

  useFrame(({ clock }) => {
    if (portalRef.current) {
      const t = clock.getElapsedTime();
      // Enhanced portal rotation with stronger audio response
      portalRef.current.rotation.y = t * (0.5 + bass * 2.0 + mids * 1.5);
      portalRef.current.rotation.x = Math.sin(t * 2) * bass * 0.4;
      
      // Add scaling for more dynamic effect
      const scale = 1 + Math.sin(t * 4) * 0.1 + bass * 0.3;
      portalRef.current.scale.setScalar(scale);
      
      // Add position movement
      portalRef.current.position.y = Math.sin(t * 3) * mids * 0.5;
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