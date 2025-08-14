import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";

function AlienMembraneShaderMaterial({ audioData }: any) {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  const extractedColors = (window as any).extractedColors;

  const texture = useMemo(() => {
    const at = (window as any).appliedTexture;
    if (!at) return null;
    if (typeof at === "string") {
      const tex = new THREE.TextureLoader().load(at);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }
    return at as THREE.Texture;
  }, []);
  
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
    uTexture: { value: texture || null },
    uHasTexture: { value: texture ? 1.0 : 0.0 },
  }), [primaryRgb, secondaryRgb, accentRgb, extractedColors, texture]);

  return (
    <shaderMaterial
      ref={shaderRef}
      uniforms={uniforms}
      vertexShader={`
        uniform float uTime;
        uniform float uBass;
        uniform float uMids;
        uniform float uHighs;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        void main() {
          vNormal = normal;
          vPosition = position;
          vUv = uv;
          
          // Ant-like movement patterns under the skin
          float antTrails1 = 0.4 * sin(uTime * 8.0 + position.x * 25.0 + position.y * 15.0 + uBass * 4.0);
          float antTrails2 = 0.3 * sin(uTime * 12.0 + position.z * 20.0 + position.y * 18.0 + uMids * 3.0);
          float antTrails3 = 0.2 * sin(uTime * 16.0 + position.x * 18.0 + position.z * 22.0 + uHighs * 5.0);
          
          // Crawling surface movements
          float surfaceCrawl = 0.15 * sin(uTime * 20.0 + position.x * 30.0 + position.z * 35.0);
          float deepMovement = 0.25 * sin(uTime * 6.0 + position.y * 12.0 + uBass * 6.0);
          
          // Enhanced audio-reactive pulsing
          float extremeTopPulse = smoothstep(-0.8, 1.5, position.y) * 0.6 * sin(uTime * 8.0 + uBass * 4.0);
          float violentSidePulse = 0.4 * sin(uTime * 12.0 + position.y * 20.0 + uBass * 3.0);
          float chaoticDetailPulse = 0.3 * sin(uTime * 18.0 + position.x * 12.0 + position.z * 12.0);
          
          // Enhanced beat explosion
          float beatExplosion = uBass > 0.4 ? (1.0 + uBass * 1.2) : 1.0;
          float midsExpansion = uMids > 0.3 ? (1.0 + uMids * 0.8) : 1.0;
          
          vec3 antMovement = normal * (antTrails1 + antTrails2 + antTrails3 + surfaceCrawl + deepMovement);
          vec3 audioPulse = normal * (extremeTopPulse + violentSidePulse + chaoticDetailPulse) * beatExplosion * midsExpansion;
          vec3 displacement = (antMovement + audioPulse) * (0.8 + uBass * 0.8 + uMids * 0.6);
          
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
        uniform sampler2D uTexture;
        uniform float uHasTexture;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        void main() {
          float intensity = 0.7 + 0.3 * sin(uTime * 6.0 + vPosition.y * 15.0);
          
          vec3 baseColor = mix(uPrimaryColor, uSecondaryColor, intensity);
          vec3 chroma = baseColor + 0.1 * uAccentColor * vec3(sin(vPosition.x * 10.0), sin(vPosition.y * 10.0), sin(vPosition.z * 10.0));
          
          if (uHasTexture > 0.5) {
            vec4 texColor = texture2D(uTexture, vUv);
            chroma = texColor.rgb * baseColor;
          }
          
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
      
      // Balanced organic movement - strong bass response, subtle mids/highs
      groupRef.current.position.y = Math.sin(t * 3.0) * 0.8 + bass * 3.0 + mids * 0.5;
      groupRef.current.rotation.y = t * 1.2 + bass * 4.0 + mids * 0.8;
      
      groupRef.current.rotation.x = Math.sin(t * 2.0) * 0.4 + bass * 2.5 + mids * 0.3;
      groupRef.current.rotation.z = Math.cos(t * 1.5) * 0.3 + bass * 1.8 + highs * 0.2;
      
      // Strong bass response with subtle baseline movement
      const beatScale = bass > 0.3 ? 1 + bass * 2.0 : 1 + Math.sin(t * 4.0) * 0.1;
      const midsScale = mids > 0.2 ? 1 + mids * 0.5 : 1;
      groupRef.current.scale.setScalar(0.6 * beatScale * midsScale);
      
      // Subtle position shifts for organic feel
      groupRef.current.position.x = Math.sin(t * 1.5) * 0.2 + bass * 0.6;
      groupRef.current.position.z = Math.cos(t * 1.2) * 0.2 + highs * 0.3;
    }
  });

  return (
    <group ref={groupRef} scale={0.7}>
      <mesh ref={meshRef} scale={1 + bass * 0.6}>
        <icosahedronGeometry args={[1.4, 8]} />
        <AlienMembraneShaderMaterial audioData={audioData} />
      </mesh>
      <Sparkles
        count={4 + highs * 15}
        scale={[1, 1, 1]}
        size={1 + highs * 2 + bass * 1.5}
        speed={0.3 + highs * 0.8 + bass * 0.6}
        opacity={0.01 + highs * 0.04}
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
