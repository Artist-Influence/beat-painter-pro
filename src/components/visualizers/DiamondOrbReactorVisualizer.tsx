import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { VisualizerProps } from "../visualizer";
import { useStudioStore } from "@/stores/studioStore";
import { useVisualizerTexture, VisualizerTextureData } from "@/hooks/useVisualizerTexture";

function ReactorCore({ 
  audioData, 
  textureData 
}: { 
  audioData: VisualizerProps["audioData"]; 
  textureData: VisualizerTextureData;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const beamsRef = useRef<THREE.InstancedMesh>(null);

  const { audioSensitivity } = useStudioStore();

  // Smoothing refs
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  const smoothedBeat = useRef(0);

  const beamCount = 60;

  // Extract colors from textureData
  const primaryColor = textureData?.colors?.primary || '#ffffff';
  const secondaryColor = textureData?.colors?.secondary || '#ffffff';
  const accentColor = textureData?.colors?.accent || '#ffffff';
  const isNeon = textureData?.colors?.isNeon || false;
  const isMetallic = textureData?.colors?.isMetallic || false;

  // Create geometries and materials with texture/style support
  const { shellGeo, coreGeo, beamGeo, shellMat, coreMat, beamMat } = useMemo(() => {
    const shellGeo = new THREE.IcosahedronGeometry(1.0, 3);
    const coreGeo = new THREE.OctahedronGeometry(0.4, 2);
    const beamGeo = new THREE.CylinderGeometry(0.012, 0.012, 1.0, 8, 1, true);

    const shellMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(primaryColor),
      roughness: isMetallic ? 0.1 : 0.15,
      metalness: isMetallic ? 0.5 : 0.3,
      emissive: new THREE.Color(primaryColor),
      emissiveIntensity: isNeon ? 0.3 : 0.15,
      transparent: true,
      opacity: 0.88,
      map: textureData?.texture || undefined,
      emissiveMap: textureData?.texture || undefined,
    });

    const coreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor),
      roughness: isMetallic ? 0.15 : 0.25,
      metalness: isMetallic ? 0.85 : 0.7,
      emissive: new THREE.Color(accentColor),
      emissiveIntensity: isNeon ? 0.5 : 0.3,
      map: textureData?.texture || undefined,
      emissiveMap: textureData?.texture || undefined,
    });

    const beamMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(secondaryColor),
      roughness: isMetallic ? 0.1 : 0.2,
      metalness: isMetallic ? 0.95 : 0.85,
      emissive: new THREE.Color(secondaryColor),
      emissiveIntensity: isNeon ? 0.4 : 0.2,
    });

    return { shellGeo, coreGeo, beamGeo, shellMat, coreMat, beamMat };
  }, [textureData.textureVersion, primaryColor, secondaryColor, accentColor, isNeon, isMetallic, textureData?.texture]);

  // Pre-place beam instances radially
  useEffect(() => {
    if (!beamsRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < beamCount; i++) {
      const angle = (i / beamCount) * Math.PI * 2;
      const tilt = (i % 2 === 0 ? 1 : -1) * 0.4;
      dummy.position.set(0, 0, 0);
      dummy.rotation.set(tilt, angle, 0);
      dummy.translateZ(0.25);
      dummy.updateMatrix();
      beamsRef.current.setMatrixAt(i, dummy.matrix);
    }
    beamsRef.current.instanceMatrix.needsUpdate = true;
  }, [beamCount]);

  useFrame((_, dt) => {
    const freq = audioData.frequency;
    const beatStrength = audioData.beatStrength;
    const { bassMultiplier, midsMultiplier, highsMultiplier, animationSpeed } = audioSensitivity;

    // Calculate raw audio values
    let bassSum = 0, midsSum = 0, highsSum = 0;
    for (let i = 0; i <= 85; i++) bassSum += freq[i] || 0;
    for (let i = 86; i <= 170; i++) midsSum += freq[i] || 0;
    for (let i = 171; i <= 255; i++) highsSum += freq[i] || 0;

    const rawBass = Math.min((bassSum / 86 / 255) * bassMultiplier, 1.5);
    const rawMids = Math.min((midsSum / 85 / 255) * midsMultiplier, 1.5);
    const rawHighs = Math.min((highsSum / 85 / 255) * highsMultiplier, 1.5);
    const rawBeat = Math.max(beatStrength, rawBass * 0.8);

    // Asymmetric smoothing (fast attack, fast decay for punchy response)
    const attackLerp = 0.55;
    const decayLerp = 0.35;
    const lerpVal = (current: number, target: number) => {
      const factor = target > current ? attackLerp : decayLerp;
      return current + (target - current) * factor;
    };

    smoothedBass.current = lerpVal(smoothedBass.current, rawBass);
    smoothedMids.current = lerpVal(smoothedMids.current, rawMids);
    smoothedHighs.current = lerpVal(smoothedHighs.current, rawHighs);
    smoothedBeat.current = lerpVal(smoothedBeat.current, rawBeat);

    // Transient blend for punch (70% smoothed, 30% raw)
    const bassFinal = smoothedBass.current * 0.7 + rawBass * 0.3;
    const midsFinal = smoothedMids.current * 0.7 + rawMids * 0.3;
    const highsFinal = smoothedHighs.current * 0.7 + rawHighs * 0.3;
    const beatFinal = smoothedBeat.current * 0.7 + rawBeat * 0.3;

    // animationSpeed ONLY affects subtle ambient drift, NOT audio reactivity
    const ambientDrift = dt * 0.02 * animationSpeed;

    // Group rotation - AUDIO-DRIVEN PRIMARY, ambient drift secondary
    if (groupRef.current) {
      groupRef.current.rotation.y += bassFinal * 0.6 + ambientDrift;
      groupRef.current.rotation.x = bassFinal * 0.15;
    }

    // Shell: scale driven by bass + beat pop, rotation ONLY when audio plays
    if (shellRef.current) {
      const beatPop = beatFinal > 0.4 ? 1 + (beatFinal - 0.4) * 1.5 : 1;
      const shellScale = (1 + bassFinal * 0.5) * beatPop;
      shellRef.current.scale.setScalar(shellScale);
      
      // Rotation ONLY driven by audio (no animSpeed dampening)
      shellRef.current.rotation.y += bassFinal * 1.5;
      shellRef.current.rotation.z += bassFinal * 0.8;
      
      // Emissive intensity driven by highs
      (shellRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 
        (isNeon ? 0.2 : 0.1) + highsFinal * 1.2;
    }

    // Core: rotation ONLY driven by mids (no animSpeed dampening)
    if (coreRef.current) {
      coreRef.current.rotation.y += midsFinal * 6.0;
      coreRef.current.rotation.x += midsFinal * 4.0;
      coreRef.current.rotation.z += midsFinal * 2.5;
      
      // Scale pulse with mids + bass
      const coreScale = 1 + midsFinal * 0.4 + bassFinal * 0.3;
      coreRef.current.scale.setScalar(coreScale);
      
      (coreRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 
        (isNeon ? 0.4 : 0.2) + highsFinal * 1.0;
    }

    // Beams: rotation ONLY driven by mids (no animSpeed dampening)
    if (beamsRef.current) {
      beamsRef.current.rotation.y += midsFinal * 7.0;
      beamsRef.current.rotation.x += midsFinal * 3.0;
      
      const beamScale = 1 + bassFinal * 0.4;
      beamsRef.current.scale.setScalar(beamScale);
      
      (beamsRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 
        (isNeon ? 0.3 : 0.1) + highsFinal * 1.2;
    }
  });

  // Dynamic sparkle count based on smoothed highs
  const sparkleCount = useMemo(() => 80, []);

  return (
    <group ref={groupRef}>
      {/* Outer Shell - faceted icosahedron */}
      <mesh ref={shellRef} geometry={shellGeo} material={shellMat} />

      {/* Inner Reactor Core - octahedron */}
      <mesh ref={coreRef} geometry={coreGeo} material={coreMat} />

      {/* Internal Beam Array */}
      <instancedMesh ref={beamsRef} args={[beamGeo, beamMat, beamCount]} />

      {/* Sparkle Layer - driven by highs, uses accent color */}
      <Sparkles
        count={sparkleCount}
        size={1.5}
        speed={0.4}
        opacity={0.75}
        scale={2.0}
        color={accentColor}
      />
    </group>
  );
}

export default function DiamondOrbReactorVisualizer({
  audioData,
  styleAdjustments,
  width,
  height,
  zoomLevel,
  backgroundColor,
}: VisualizerProps) {
  const textureData = useVisualizerTexture();

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 4, 5]} intensity={0.9} />
      <directionalLight position={[-2, -3, -4]} intensity={0.3} />
      <Environment preset="city" />
      <ReactorCore audioData={audioData} textureData={textureData} />
    </>
  );
}
