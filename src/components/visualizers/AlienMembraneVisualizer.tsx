import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from ".";
import { useStudioStore } from "@/stores/studioStore";

function AlienMembraneShaderMaterial({ audioData }: any) {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const { audioSensitivity } = useStudioStore();

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

  // Smoothing refs for shader
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);

  useFrame(({ clock }) => {
    if (shaderRef.current) {
      const t = clock.getElapsedTime() * audioSensitivity.animationSpeed;
      
      // Calculate audio per-frame
      let bassSum = 0, midsSum = 0, highsSum = 0;
      for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
      for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
      for (let i = 171; i <= 255; i++) highsSum += frequency[i] || 0;
      
      const rawBass = (bassSum / 86 / 255) * audioSensitivity.bassMultiplier * 1.3; // 1.3x boost
      const rawMids = (midsSum / 85 / 255) * audioSensitivity.midsMultiplier;
      const rawHighs = (highsSum / 85 / 255) * audioSensitivity.highsMultiplier;
      
      // Faster asymmetric smoothing for punchier response
      const attackLerp = 0.65;
      const decayLerp = 0.25;
      const lerpVal = (current: number, target: number) => {
        const factor = target > current ? attackLerp : decayLerp;
        return current + (target - current) * factor;
      };
      
      smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
      smoothedMids.current = lerpVal(smoothedMids.current, rawMids);
      smoothedHighs.current = lerpVal(smoothedHighs.current, rawHighs);
      
      shaderRef.current.uniforms.uTime.value = t;
      shaderRef.current.uniforms.uBass.value = smoothedBass.current;
      shaderRef.current.uniforms.uMids.value = smoothedMids.current;
      shaderRef.current.uniforms.uHighs.value = smoothedHighs.current;
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
          
          // Audio activity check - only animate when audio present
          float audioActivity = uBass + uMids + uHighs;
          float audioMult = audioActivity > 0.02 ? 1.0 : 0.0;
          
          // Ant-like movement patterns under the skin - GATED by audio
          float antTrails1 = audioMult * 0.4 * sin(uTime * 8.0 + position.x * 25.0 + position.y * 15.0 + uBass * 4.0);
          float antTrails2 = audioMult * 0.3 * sin(uTime * 12.0 + position.z * 20.0 + position.y * 18.0 + uMids * 3.0);
          float antTrails3 = audioMult * 0.2 * sin(uTime * 16.0 + position.x * 18.0 + position.z * 22.0 + uHighs * 5.0);
          
          // Crawling surface movements - GATED by audio
          float surfaceCrawl = audioMult * 0.15 * sin(uTime * 20.0 + position.x * 30.0 + position.z * 35.0);
          float deepMovement = audioMult * 0.25 * sin(uTime * 6.0 + position.y * 12.0 + uBass * 6.0);
          
          // Enhanced audio-reactive pulsing - GATED by audio
          float extremeTopPulse = audioMult * smoothstep(-0.8, 1.5, position.y) * 0.6 * sin(uTime * 8.0 + uBass * 4.0);
          float violentSidePulse = audioMult * 0.4 * sin(uTime * 12.0 + position.y * 20.0 + uBass * 3.0);
          float chaoticDetailPulse = audioMult * 0.3 * sin(uTime * 18.0 + position.x * 12.0 + position.z * 12.0);
          
          // Enhanced beat explosion - lower threshold, higher multiplier
          float beatExplosion = uBass > 0.2 ? (1.0 + uBass * 1.8) : 1.0;
          float midsExpansion = uMids > 0.2 ? (1.0 + uMids * 1.2) : 1.0;
          
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
  const { audioSensitivity } = useStudioStore();

  const safeAudioData = audioData || { frequency: Array(256).fill(0), amplitude: 0, beatStrength: 0 };
  const frequency = safeAudioData.frequency || Array(256).fill(0);

  const extractedColors = (window as any).extractedColors;
  const accentColor = extractedColors?.accent || '#ffffff';

  // Smoothing refs
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  const smoothedBeat = useRef(0);
  
  // Base rotation for position-based rotation
  const baseRotation = useRef({ x: 0, y: 0, z: 0 });

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      const speed = audioSensitivity.animationSpeed;
      
      // Calculate audio per-frame
      let bassSum = 0, midsSum = 0, highsSum = 0;
      for (let i = 0; i <= 85; i++) bassSum += frequency[i] || 0;
      for (let i = 86; i <= 170; i++) midsSum += frequency[i] || 0;
      for (let i = 171; i <= 255; i++) highsSum += frequency[i] || 0;
      
      const rawBass = (bassSum / 86 / 255) * audioSensitivity.bassMultiplier * 1.3;
      const rawMids = (midsSum / 85 / 255) * audioSensitivity.midsMultiplier;
      const rawHighs = (highsSum / 85 / 255) * audioSensitivity.highsMultiplier;
      const rawBeat = Math.max(safeAudioData.beatStrength || 0, rawBass * 0.8);
      
      // Faster asymmetric smoothing
      const attackLerp = 0.65;
      const decayLerp = 0.25;
      const lerpVal = (current: number, target: number) => {
        const factor = target > current ? attackLerp : decayLerp;
        return current + (target - current) * factor;
      };
      
      smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
      smoothedMids.current = lerpVal(smoothedMids.current, rawMids);
      smoothedHighs.current = lerpVal(smoothedHighs.current, rawHighs);
      smoothedBeat.current = lerpVal(smoothedBeat.current, rawBeat);
      
      const bass = smoothedBass.current;
      const mids = smoothedMids.current;
      const highs = smoothedHighs.current;
      const beat = smoothedBeat.current;
      
      // Audio threshold check - completely still when silent
      const audioThreshold = 0.02;
      const hasAudio = bass > audioThreshold || mids > audioThreshold || highs > audioThreshold;
      
      // Beat pop - lower threshold
      const beatPop = beat > 0.2 ? 1 + (beat - 0.2) * 0.8 : 1;
      
      // AUDIO-FIRST scale with beat pop - higher multiplier
      const beatScale = Math.min(hasAudio ? (1 + bass * 0.5 + mids * 0.15) * beatPop : 1, 1.8);
      groupRef.current.scale.setScalar(0.35 * beatScale);
      
      // Get spinSpeed from store
      const spinSpeed = audioSensitivity.spinSpeed ?? 0;
      
      // Only rotate when spinSpeed > 0 OR audio is present
      if (spinSpeed > 0 || hasAudio) {
        baseRotation.current.y += (spinSpeed > 0 ? 0.05 * spinSpeed : 0) + (hasAudio ? 0.002 * speed : 0);
        baseRotation.current.x += hasAudio ? 0.001 * speed : 0;
        baseRotation.current.z += hasAudio ? 0.0005 * speed : 0;
      }
      
      // Audio offset for rotation
      const offsetY = hasAudio ? bass * Math.PI * 0.15 : 0;
      const offsetX = hasAudio ? mids * Math.PI * 0.08 : 0;
      const offsetZ = hasAudio ? highs * Math.PI * 0.04 : 0;
      
      groupRef.current.rotation.y = baseRotation.current.y + offsetY;
      groupRef.current.rotation.x = baseRotation.current.x + offsetX;
      groupRef.current.rotation.z = baseRotation.current.z + offsetZ;
      
      // POSITION: Proportional to audio (returns to 0 when silent)
      groupRef.current.position.y = bass * 0.5;
      groupRef.current.position.x = mids * 0.2;
      groupRef.current.position.z = highs * 0.1;
    }
  });

  return (
    <group ref={groupRef} scale={0.6}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.2, 8]} />
        <AlienMembraneShaderMaterial audioData={audioData} />
      </mesh>
      <Sparkles
        count={smoothedHighs.current > 0.02 ? 20 : 0}
        scale={[1, 1, 1]}
        size={2}
        speed={smoothedHighs.current > 0.02 ? 1 : 0}
        opacity={0.05}
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
