import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";

function AlienMembraneShaderMaterial({ audioData }: any) {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  const extractedColors = (window as any).extractedColors;
  
  const primaryColor = extractedColors?.primary || '#ffffff';
  const secondaryColor = extractedColors?.secondary || '#ffffff';
  const accentColor = extractedColors?.accent || '#ffffff';
  
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 1, g: 1, b: 1 };
  };

  const primaryRgb = hexToRgb(primaryColor);
  const secondaryRgb = hexToRgb(secondaryColor);
  const accentRgb = hexToRgb(accentColor);

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return sum / 86 / 255;
  }, [frequency]);

  const mids = useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
    return sum / 85 / 255;
  }, [frequency]);

  const highs = useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
    return sum / 85 / 255;
  }, [frequency]);

  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = clock.getElapsedTime();
      shaderRef.current.uniforms.uBass.value = bass;
      shaderRef.current.uniforms.uMids.value = mids;
      shaderRef.current.uniforms.uHighs.value = highs;
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMids: { value: 0 },
    uHighs: { value: 0 },
    uPrimaryColor: { value: new THREE.Vector3(primaryRgb.r, primaryRgb.g, primaryRgb.b) },
    uSecondaryColor: { value: new THREE.Vector3(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b) },
    uAccentColor: { value: new THREE.Vector3(accentRgb.r, accentRgb.g, accentRgb.b) },
    uIsNeon: { value: extractedColors?.isNeon ? 1.0 : 0.0 },
    uIsMetallic: { value: extractedColors?.isMetallic ? 1.0 : 0.0 },
  }), [primaryRgb, secondaryRgb, accentRgb, extractedColors]);

  return (
    <shaderMaterial
      ref={shaderRef}
      uniforms={uniforms}
      vertexShader={`
        uniform float uTime;
        uniform float uBass;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normal;
          vPosition = position;
          
          float extremeTopPulse = smoothstep(-0.8, 1.5, position.y) * 2.5 * sin(uTime * 4.0 + uBass * 15.0);
          float violentSidePulse = 1.2 * sin(uTime * 6.0 + position.y * 15.0 + uBass * 12.0);
          float chaoticDetailPulse = 0.8 * sin(uTime * 12.0 + position.x * 8.0 + position.z * 8.0);
          
          float beatExplosion = uBass > 0.6 ? (1.0 + uBass * 4.0) : 1.0;
          
          vec3 displacement = normal * (extremeTopPulse + violentSidePulse + chaoticDetailPulse) * (1.0 + uBass * 3.5) * beatExplosion;
          vec3 pos = position + displacement;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `}
      fragmentShader={`
        uniform float uTime;
        uniform float uHighs;
        uniform vec3 uPrimaryColor;
        uniform vec3 uSecondaryColor;
        uniform vec3 uAccentColor;
        uniform float uIsNeon;
        uniform float uIsMetallic;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float intensity = 0.7 + 0.3 * sin(uTime * 6.0 + vPosition.y * 15.0);
          
          vec3 glow = mix(uPrimaryColor, uSecondaryColor, intensity);
          vec3 chroma = glow + 0.1 * uAccentColor * vec3(sin(vPosition.x * 10.0), sin(vPosition.y * 10.0), sin(vPosition.z * 10.0));
          
          if (uIsNeon > 0.5) {
            chroma *= (1.0 + uHighs * 2.0);
          }
          
          if (uIsMetallic > 0.5) {
            float metallic = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
            chroma = mix(chroma, vec3(1.0), metallic * 0.2);
          }
          
          gl_FragColor = vec4(chroma * (1.0 + uHighs), 1.0);
        }
      `}
      transparent={false}
    />
  );
}

function AlienMembrane({ audioData }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  const extractedColors = (window as any).extractedColors;
  const accentColor = extractedColors?.accent || '#ffffff';

  const bass = useMemo(() => {
    let sum = 0;
    for (let i = 0; i <= 85; i++) sum += frequency[i] || 0;
    return sum / 86 / 255;
  }, [frequency]);

  const mids = useMemo(() => {
    let sum = 0;
    for (let i = 86; i <= 170; i++) sum += frequency[i] || 0;
    return sum / 85 / 255;
  }, [frequency]);

  const highs = useMemo(() => {
    let sum = 0;
    for (let i = 171; i <= 255; i++) sum += frequency[i] || 0;
    return sum / 85 / 255;
  }, [frequency]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      
      groupRef.current.position.y = Math.sin(t * 4.0) * 1.2 + bass * 2.5;
      groupRef.current.rotation.y = t * 0.8 + mids * 3.0;
      
      groupRef.current.rotation.x = Math.sin(t * 2.5) * 0.6 + mids * 1.5 + bass * 2.0;
      groupRef.current.rotation.z = Math.cos(t * 1.8) * 0.4 + highs * 1.2;
      
      const beatScale = bass > 0.5 ? 1 + bass * 0.8 : 1;
      groupRef.current.scale.setScalar(0.6 * beatScale);
    }
  });

  return (
    <group ref={groupRef} scale={0.05}>
      <mesh ref={meshRef} scale={1 + bass * 0.6}>
        <icosahedronGeometry args={[1.4, 8]} />
        <AlienMembraneShaderMaterial audioData={audioData} />
      </mesh>
      <Sparkles
        count={20 + highs * 300}
        scale={[5, 5, 5]}
        size={4 + highs * 40 + bass * 30}
        speed={1 + highs * 6 + bass * 8}
        opacity={0.5 + highs * 1.5}
        color={accentColor}
      />
    </group>
  );
}

export default function AlienMembraneVisualizer({
  audioData = { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 },
  styleAdjustments = { brightness: 100, saturation: 100, contrast: 100 },
  width = 1080,
  height = 1080,
  zoomLevel = 1,
  backgroundColor = '#00FF00',
}: VisualizerProps & { 
  styleAdjustments?: { brightness: number; saturation: number; contrast: number }; 
}) {
  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 7, 6]} intensity={0.9} />
      <Environment preset="city" />
      <AlienMembrane audioData={audioData} />
    </>
  );
}
