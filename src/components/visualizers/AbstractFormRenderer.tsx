import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AbstractFormParams } from '@/lib/abstractFormGenerator';
import { applyReactivityCurve } from '@/lib/abstractFormGenerator';
import { seededRandom } from '@/lib/randomVisualizerGenerator';
import { useVisualizerTexture } from '@/hooks/useVisualizerTexture';
import { useStudioStore } from '@/stores/studioStore';

interface AbstractFormRendererProps {
  params: AbstractFormParams;
  audioData: {
    frequency: number[];
    amplitude: number;
    beatStrength: number;
  };
  savedStyle?: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      isNeon: boolean;
      isMetallic: boolean;
    };
  };
}

// ==================== AUDIO ANALYSIS ====================

function analyzeAudio(frequency: number[]) {
  const freq = frequency || [];
  if (freq.length === 0) return { bass: 0, mids: 0, highs: 0 };
  
  const bassRange = freq.slice(0, 15);
  const midRange = freq.slice(15, 100);
  const highRange = freq.slice(100);
  
  const bass = bassRange.length > 0 ? Math.max(0, ...bassRange) / 255 : 0;
  const lowMids = midRange.slice(0, 20);
  const mids = lowMids.length > 0 ? Math.max(0, ...lowMids) / 255 : 0;
  const highs = highRange.length > 0 ? highRange.reduce((a, b) => a + b, 0) / highRange.length / 255 : 0;
  
  // Increased multipliers for more dramatic audio response
  return {
    bass: Math.min(bass * 4.5, 3.0),
    mids: Math.min(mids * 3.5, 2.5),
    highs: Math.min(highs * 3.0, 2.0),
  };
}

// Asymmetric smoothing - fast attack, slower decay for punchy response
function smoothValue(current: number, target: number): number {
  const attackSpeed = 0.85;
  const decaySpeed = 0.35;
  const isRising = target > current;
  return current + (target - current) * (isRising ? attackSpeed : decaySpeed);
}

// ==================== NOISE FUNCTIONS ====================

function simplex3D(x: number, y: number, z: number): number {
  // Simplified noise approximation
  const p = (Math.sin(x * 1.2) * Math.cos(y * 0.9) + Math.sin(z * 1.1)) * 0.5;
  return Math.sin(p * 6.28 + x * y) * 0.5 + 0.5;
}

function applyNoise(
  position: THREE.Vector3,
  time: number,
  params: AbstractFormParams
): THREE.Vector3 {
  const scale = params.noiseScale;
  const speed = params.noiseSpeed;
  const amplitude = params.noiseAmplitude;
  
  const nx = simplex3D(position.x * scale + time * speed, position.y * scale, position.z * scale);
  const ny = simplex3D(position.x * scale, position.y * scale + time * speed, position.z * scale);
  const nz = simplex3D(position.x * scale, position.y * scale, position.z * scale + time * speed);
  
  return new THREE.Vector3(
    position.x + (nx - 0.5) * amplitude,
    position.y + (ny - 0.5) * amplitude,
    position.z + (nz - 0.5) * amplitude
  );
}

// ==================== LATTICE FORM ====================

function LatticeForm({ params, audioData, savedStyle }: AbstractFormRendererProps) {
  const groupRef = useRef<THREE.Group>(null);
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  
  // FIX: Store audioData in ref to avoid stale closure in useFrame
  const audioDataRef = useRef(audioData);
  audioDataRef.current = audioData;
  
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const textureData = useVisualizerTexture();
  
  // Generate lattice nodes
  const { nodePositions, edgeIndices, nodeCount } = useMemo(() => {
    const r = seededRandom(params.geometrySeed);
    const count = Math.min(params.nodeCount, 150);
    const positions: number[] = [];
    const edges: number[] = [];
    
    // Generate node positions in 3D grid with noise offset
    const gridSize = Math.ceil(Math.cbrt(count));
    const spacing = params.latticeSpacing * 2;
    
    for (let i = 0; i < count; i++) {
      const ix = i % gridSize;
      const iy = Math.floor(i / gridSize) % gridSize;
      const iz = Math.floor(i / (gridSize * gridSize));
      
      // Base grid position with randomness based on chaos
      const x = (ix - gridSize / 2) * spacing + (r() - 0.5) * params.chaosLevel * spacing;
      const y = (iy - gridSize / 2) * spacing + (r() - 0.5) * params.chaosLevel * spacing;
      const z = (iz - gridSize / 2) * spacing + (r() - 0.5) * params.chaosLevel * spacing;
      
      positions.push(x, y, z);
    }
    
    // Generate edges based on connection density
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        if (r() < params.connectionDensity * 0.3) {
          edges.push(i, j);
        }
      }
    }
    
    return {
      nodePositions: new Float32Array(positions),
      edgeIndices: edges,
      nodeCount: count,
    };
  }, [params.geometrySeed, params.nodeCount, params.latticeSpacing, params.connectionDensity, params.chaosLevel]);
  
  const material = useMemo(() => {
    // Priority: savedStyle colors > textureData (window colors)
    const colors = savedStyle?.colors || textureData.colors;
    const color = new THREE.Color(colors.primary);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: params.emissiveMin,
      metalness: 0.8,
      roughness: 0.2,
      wireframe: params.wireframeProbability > 0.5,
    });
    
    // Apply texture if available
    if (textureData.texture) {
      mat.map = textureData.texture;
      mat.emissiveMap = textureData.texture;
      mat.needsUpdate = true;
    }
    
    return mat;
  }, [savedStyle?.colors, textureData.texture, textureData.colors.primary, textureData.textureVersion, params.emissiveMin, params.wireframeProbability]);
  
  // Get colors for lights
  const colors = savedStyle?.colors || textureData.colors;
  
  useFrame(({ clock }) => {
    // Use ref to always get latest audioData
    const { bass, mids, highs } = analyzeAudio(audioDataRef.current.frequency);
    const sens = audioSensitivity;
    const t = clock.getElapsedTime();
    
    // Apply reactivity curves
    const bassEffect = applyReactivityCurve(bass * sens.bassMultiplier, params.bassReactivityCurve) * params.bassIntensity;
    const midsEffect = applyReactivityCurve(mids * sens.midsMultiplier, params.midsReactivityCurve) * params.midsIntensity;
    const highsEffect = applyReactivityCurve(highs * sens.highsMultiplier, params.highsReactivityCurve) * params.highsIntensity;
    
    // Smooth audio values with asymmetric attack/decay
    smoothedBass.current = smoothValue(smoothedBass.current, bassEffect);
    smoothedMids.current = smoothValue(smoothedMids.current, midsEffect);
    smoothedHighs.current = smoothValue(smoothedHighs.current, highsEffect);
    
    if (groupRef.current) {
      // BASS: Large-scale topology changes based on mode
      switch (params.bassTopologyMode) {
        case 'expand':
          groupRef.current.scale.setScalar(1.5 + smoothedBass.current * 0.8);
          break;
        case 'fracture':
          // Nodes spread apart
          groupRef.current.scale.setScalar(1.5 + smoothedBass.current * 0.5);
          break;
        case 'ripple':
          groupRef.current.position.y = Math.sin(t * 3 + smoothedBass.current * 5) * smoothedBass.current * 0.5;
          break;
        case 'morph':
          groupRef.current.scale.x = 1.5 + smoothedBass.current * 0.6;
          groupRef.current.scale.y = 1.5 + smoothedBass.current * 0.3;
          groupRef.current.scale.z = 1.5 + smoothedBass.current * 0.4;
          break;
        case 'explode':
          groupRef.current.scale.setScalar(1.5 + smoothedBass.current * 1.2);
          break;
        case 'warp':
          groupRef.current.rotation.x = Math.sin(t + smoothedBass.current * 3) * 0.3;
          groupRef.current.rotation.z = Math.cos(t + smoothedBass.current * 3) * 0.3;
          break;
      }
      
      // MIDS: Secondary motion
      switch (params.midsTopologyMode) {
        case 'twist':
          groupRef.current.rotation.y += smoothedMids.current * 0.05;
          break;
        case 'oscillate':
          groupRef.current.rotation.z = Math.sin(t * 4) * smoothedMids.current * 0.2;
          break;
        case 'wave':
          groupRef.current.position.x = Math.sin(t * 2) * smoothedMids.current * 0.3;
          break;
        case 'fold':
          groupRef.current.scale.y *= (1 - smoothedMids.current * 0.3);
          break;
        case 'pulse':
          const pulse = 1 + Math.sin(t * 6) * smoothedMids.current * 0.15;
          groupRef.current.scale.multiplyScalar(pulse);
          break;
        case 'subdivide':
          // Visual subdivision effect through rotation
          groupRef.current.rotation.x += smoothedMids.current * 0.03;
          break;
      }
      
      // Rotation ONLY when spinSpeed > 0
      if (sens.spinSpeed > 0) {
        const audioIntensity = (smoothedBass.current + smoothedMids.current) * 0.5;
        const rotationMult = sens.spinSpeed * (0.1 + audioIntensity * 0.9);
        if (params.rotationAxes[0]) groupRef.current.rotation.x += params.rotationSpeeds[0] * 0.01 * rotationMult;
        if (params.rotationAxes[1]) groupRef.current.rotation.y += params.rotationSpeeds[1] * 0.01 * rotationMult;
        if (params.rotationAxes[2]) groupRef.current.rotation.z += params.rotationSpeeds[2] * 0.01 * rotationMult;
      }
    }
    
    // HIGHS: Fine detail - update emissive intensity
    if (material) {
      material.emissiveIntensity = params.emissiveMin + smoothedHighs.current * (params.emissiveMax - params.emissiveMin);
      
      // Jitter/shimmer effect
      if (params.highsTopologyMode === 'jitter' || params.highsTopologyMode === 'shimmer') {
        material.opacity = 0.8 + smoothedHighs.current * 0.2;
      }
    }
    
    // Update instanced nodes with audio-reactive positions
    if (nodesRef.current) {
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      
      for (let i = 0; i < nodeCount; i++) {
        // Get base position
        position.set(
          nodePositions[i * 3],
          nodePositions[i * 3 + 1],
          nodePositions[i * 3 + 2]
        );
        
        // Apply noise deformation
        const noised = applyNoise(position, t * params.noiseSpeed, params);
        
        // Apply bass expansion
        const expansionFactor = 1 + smoothedBass.current * 0.5;
        noised.multiplyScalar(expansionFactor);
        
        // Apply high-frequency jitter
        if (params.highsTopologyMode === 'jitter') {
          noised.x += (Math.random() - 0.5) * smoothedHighs.current * 0.1;
          noised.y += (Math.random() - 0.5) * smoothedHighs.current * 0.1;
          noised.z += (Math.random() - 0.5) * smoothedHighs.current * 0.1;
        }
        
        // Node size reacts to mids
        const nodeSize = 0.05 + smoothedMids.current * 0.03;
        scale.set(nodeSize, nodeSize, nodeSize);
        
        matrix.compose(noised, quaternion, scale);
        nodesRef.current.setMatrixAt(i, matrix);
      }
      nodesRef.current.instanceMatrix.needsUpdate = true;
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Nodes */}
      <instancedMesh ref={nodesRef} args={[undefined, undefined, nodeCount]}>
        <sphereGeometry args={[1, 8, 8]} />
        <primitive object={material} attach="material" />
      </instancedMesh>
      
      {/* Edges */}
      {edgeIndices.length > 0 && (
        <lineSegments ref={edgesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={nodeCount}
              array={nodePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial 
            color={colors.accent} 
            transparent 
            opacity={0.4}
          />
        </lineSegments>
      )}
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 4]} intensity={1.2} color={colors.primary} />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color={colors.accent} />
    </group>
  );
}

// ==================== ORGANIC FORM ====================

function OrganicForm({ params, audioData, savedStyle }: AbstractFormRendererProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const originalPositions = useRef<Float32Array | null>(null);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  
  // FIX: Store audioData in ref to avoid stale closure in useFrame
  const audioDataRef = useRef(audioData);
  audioDataRef.current = audioData;
  
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const textureData = useVisualizerTexture();
  
  // Get colors - priority: savedStyle > textureData
  const colors = savedStyle?.colors || textureData.colors;
  
  const material = useMemo(() => {
    const color = new THREE.Color(colors.primary);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: params.emissiveMin,
      metalness: 0.3,
      roughness: 0.6,
      wireframe: params.wireframeProbability > 0.7,
    });
    
    // Apply texture if available
    if (textureData.texture) {
      mat.map = textureData.texture;
      mat.emissiveMap = textureData.texture;
      mat.needsUpdate = true;
    }
    
    return mat;
  }, [colors.primary, textureData.texture, textureData.textureVersion, params.emissiveMin, params.wireframeProbability]);
  
  useFrame(({ clock }) => {
    // Use ref to always get latest audioData
    const { bass, mids, highs } = analyzeAudio(audioDataRef.current.frequency);
    const sens = audioSensitivity;
    const t = clock.getElapsedTime();
    
    const bassEffect = applyReactivityCurve(bass * sens.bassMultiplier, params.bassReactivityCurve) * params.bassIntensity;
    const midsEffect = applyReactivityCurve(mids * sens.midsMultiplier, params.midsReactivityCurve) * params.midsIntensity;
    const highsEffect = applyReactivityCurve(highs * sens.highsMultiplier, params.highsReactivityCurve) * params.highsIntensity;
    
    smoothedBass.current = smoothValue(smoothedBass.current, bassEffect);
    smoothedMids.current = smoothValue(smoothedMids.current, midsEffect);
    smoothedHighs.current = smoothValue(smoothedHighs.current, highsEffect);
    
    if (meshRef.current && meshRef.current.geometry) {
      const geometry = meshRef.current.geometry;
      const positions = geometry.attributes.position;
      
      // Store original positions on first frame
      if (!originalPositions.current) {
        originalPositions.current = new Float32Array(positions.array);
      }
      
      // Deform vertices based on audio
      for (let i = 0; i < positions.count; i++) {
        const ox = originalPositions.current[i * 3];
        const oy = originalPositions.current[i * 3 + 1];
        const oz = originalPositions.current[i * 3 + 2];
        
        // Get vertex normal direction
        const length = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const nx = ox / length;
        const ny = oy / length;
        const nz = oz / length;
        
        // BASS: Membrane breathing/expansion
        const bassDeform = smoothedBass.current * 0.4;
        
        // MIDS: Wave ripple across surface
        const wavePhase = t * 2 + (ox + oy) * 2;
        const midsWave = Math.sin(wavePhase) * smoothedMids.current * 0.15;
        
        // HIGHS: Surface noise/jitter
        const highsNoise = params.highsTopologyMode === 'jitter' 
          ? (Math.random() - 0.5) * smoothedHighs.current * 0.1 
          : 0;
        
        // Combined deformation along normal
        const totalDeform = bassDeform + midsWave + highsNoise;
        
        positions.setXYZ(
          i,
          ox + nx * totalDeform,
          oy + ny * totalDeform,
          oz + nz * totalDeform
        );
      }
      
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
    }
    
    if (groupRef.current) {
      // Global transforms
      groupRef.current.scale.setScalar(1.8 + smoothedBass.current * 0.4);
      
      // Rotation ONLY when spinSpeed > 0
      if (sens.spinSpeed > 0) {
        const audioIntensity = (smoothedBass.current + smoothedMids.current) * 0.5;
        const rotationMult = sens.spinSpeed * (0.1 + audioIntensity * 0.9);
        if (params.rotationAxes[0]) groupRef.current.rotation.x += params.rotationSpeeds[0] * 0.01 * rotationMult;
        if (params.rotationAxes[1]) groupRef.current.rotation.y += params.rotationSpeeds[1] * 0.01 * rotationMult;
        if (params.rotationAxes[2]) groupRef.current.rotation.z += params.rotationSpeeds[2] * 0.01 * rotationMult;
      }
    }
    
    if (material) {
      material.emissiveIntensity = params.emissiveMin + smoothedHighs.current * (params.emissiveMax - params.emissiveMin);
    }
  });
  
  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 4]} />
        <primitive object={material} attach="material" />
      </mesh>
      
      {/* Additional organic layers */}
      {params.layerCount > 1 && (
        <mesh scale={0.7}>
          <icosahedronGeometry args={[1, 3]} />
          <meshStandardMaterial
            color={colors.secondary}
            emissive={colors.secondary}
            emissiveIntensity={params.emissiveMin * 0.5}
            transparent
            opacity={0.5}
          />
        </mesh>
      )}
      
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 4]} intensity={1.2} color={colors.primary} />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color={colors.accent} />
    </group>
  );
}

// ==================== ENERGY FORM ====================

function EnergyForm({ params, audioData, savedStyle }: AbstractFormRendererProps) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const ribbonsRef = useRef<THREE.Group>(null);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  
  // FIX: Store audioData in ref to avoid stale closure in useFrame
  const audioDataRef = useRef(audioData);
  audioDataRef.current = audioData;
  
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const textureData = useVisualizerTexture();
  
  // Get colors - priority: savedStyle > textureData
  const colors = savedStyle?.colors || textureData.colors;
  
  // Generate particle field
  const { positions, velocities, count } = useMemo(() => {
    const r = seededRandom(params.geometrySeed);
    const c = params.energyParticleCount;
    const pos = new Float32Array(c * 3);
    const vel = new Float32Array(c * 3);
    
    for (let i = 0; i < c; i++) {
      // Spherical distribution
      const theta = r() * Math.PI * 2;
      const phi = Math.acos(2 * r() - 1);
      const radius = 0.5 + r() * 2;
      
      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * radius;
      pos[i * 3 + 2] = Math.cos(phi) * radius;
      
      // Random velocities
      vel[i * 3] = (r() - 0.5) * 0.02;
      vel[i * 3 + 1] = (r() - 0.5) * 0.02;
      vel[i * 3 + 2] = (r() - 0.5) * 0.02;
    }
    
    return { positions: pos, velocities: vel, count: c };
  }, [params.geometrySeed, params.energyParticleCount]);
  
  useFrame(({ clock }) => {
    // Use ref to always get latest audioData
    const { bass, mids, highs } = analyzeAudio(audioDataRef.current.frequency);
    const sens = audioSensitivity;
    const t = clock.getElapsedTime();
    
    const bassEffect = applyReactivityCurve(bass * sens.bassMultiplier, params.bassReactivityCurve) * params.bassIntensity;
    const midsEffect = applyReactivityCurve(mids * sens.midsMultiplier, params.midsReactivityCurve) * params.midsIntensity;
    const highsEffect = applyReactivityCurve(highs * sens.highsMultiplier, params.highsReactivityCurve) * params.highsIntensity;
    
    smoothedBass.current = smoothValue(smoothedBass.current, bassEffect);
    smoothedMids.current = smoothValue(smoothedMids.current, midsEffect);
    smoothedHighs.current = smoothValue(smoothedHighs.current, highsEffect);
    
    if (particlesRef.current) {
      const posAttr = particlesRef.current.geometry.attributes.position;
      
      for (let i = 0; i < count; i++) {
        // Read from ORIGINAL positions, not current (prevents accumulation/freezing)
        const ox = positions[i * 3];
        const oy = positions[i * 3 + 1];
        const oz = positions[i * 3 + 2];
        
        // BASS: Particle expansion from origin
        const dist = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const expansionFactor = 1 + smoothedBass.current * 0.3;
        let x = ox * expansionFactor;
        let y = oy * expansionFactor;
        let z = oz * expansionFactor;
        
        // MIDS: Orbital motion (rotation around origin based on time)
        const orbitAngle = t * 0.5 + smoothedMids.current * 0.3;
        const rotX = x * Math.cos(orbitAngle) - z * Math.sin(orbitAngle);
        const rotZ = x * Math.sin(orbitAngle) + z * Math.cos(orbitAngle);
        x = rotX;
        z = rotZ;
        
        // HIGHS: Sparkle/jitter (bounded, not accumulating)
        if (params.highsTopologyMode === 'sparkle' || params.highsTopologyMode === 'jitter') {
          x += (Math.sin(t * 10 + i) - 0.5) * smoothedHighs.current * 0.05;
          y += (Math.cos(t * 10 + i * 1.3) - 0.5) * smoothedHighs.current * 0.05;
          z += (Math.sin(t * 10 + i * 0.7) - 0.5) * smoothedHighs.current * 0.05;
        }
        
        posAttr.setXYZ(i, x, y, z);
      }
      
      posAttr.needsUpdate = true;
      
      // Update particle size/opacity
      const material = particlesRef.current.material as THREE.PointsMaterial;
      material.size = 0.03 + smoothedBass.current * 0.04;
      material.opacity = 0.4 + smoothedHighs.current * 0.4;
    }
    
    if (groupRef.current) {
      groupRef.current.scale.setScalar(1.5 + smoothedBass.current * 0.5);
      
      // Rotation ONLY when spinSpeed > 0
      if (sens.spinSpeed > 0) {
        const audioIntensity = (smoothedBass.current + smoothedMids.current) * 0.5;
        const rotationMult = sens.spinSpeed * (0.1 + audioIntensity * 0.9);
        if (params.rotationAxes[0]) groupRef.current.rotation.x += params.rotationSpeeds[0] * 0.01 * rotationMult;
        if (params.rotationAxes[1]) groupRef.current.rotation.y += params.rotationSpeeds[1] * 0.02 * rotationMult;
        if (params.rotationAxes[2]) groupRef.current.rotation.z += params.rotationSpeeds[2] * 0.01 * rotationMult;
      }
    }
  });
  
  return (
    <group ref={groupRef}>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions.slice()}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={colors.primary}
          size={0.05}
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>
      
      {/* Central energy core */}
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color={colors.accent}
          emissive={colors.accent}
          emissiveIntensity={params.emissiveMax}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={2} color={colors.accent} distance={10} />
    </group>
  );
}

// ==================== VORTEX FORM ====================

function VortexForm({ params, audioData, savedStyle }: AbstractFormRendererProps) {
  const groupRef = useRef<THREE.Group>(null);
  const armsRef = useRef<THREE.Group>(null);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  
  // FIX: Store audioData in ref to avoid stale closure in useFrame
  const audioDataRef = useRef(audioData);
  audioDataRef.current = audioData;
  
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const textureData = useVisualizerTexture();
  
  // Get colors - priority: savedStyle > textureData
  const colors = savedStyle?.colors || textureData.colors;
  
  // Generate spiral arm data
  const spiralData = useMemo(() => {
    const r = seededRandom(params.geometrySeed);
    const arms: Array<{ angle: number; speed: number; particleCount: number }> = [];
    
    for (let i = 0; i < params.spiralArmCount; i++) {
      arms.push({
        angle: (i / params.spiralArmCount) * Math.PI * 2,
        speed: 0.5 + r() * 1.5,
        particleCount: Math.floor(20 + r() * 30),
      });
    }
    
    return arms;
  }, [params.geometrySeed, params.spiralArmCount]);
  
  useFrame(({ clock }) => {
    // Use ref to always get latest audioData
    const { bass, mids, highs } = analyzeAudio(audioDataRef.current.frequency);
    const sens = audioSensitivity;
    const t = clock.getElapsedTime();
    
    const bassEffect = applyReactivityCurve(bass * sens.bassMultiplier, params.bassReactivityCurve) * params.bassIntensity;
    const midsEffect = applyReactivityCurve(mids * sens.midsMultiplier, params.midsReactivityCurve) * params.midsIntensity;
    const highsEffect = applyReactivityCurve(highs * sens.highsMultiplier, params.highsReactivityCurve) * params.highsIntensity;
    
    smoothedBass.current = smoothValue(smoothedBass.current, bassEffect);
    smoothedMids.current = smoothValue(smoothedMids.current, midsEffect);
    smoothedHighs.current = smoothValue(smoothedHighs.current, highsEffect);
    
    if (groupRef.current) {
      // BASS: Vortex expansion
      groupRef.current.scale.setScalar(1.5 + smoothedBass.current * 0.6);
      groupRef.current.position.y = smoothedBass.current * 0.3;
    }
    
    if (armsRef.current) {
      // MIDS: Spiral arm rotation speed
      const spinSpeed = 0.02 + smoothedMids.current * 0.05;
      armsRef.current.rotation.y += spinSpeed;
      
      // BASS: Arm twist intensity
      armsRef.current.rotation.z = Math.sin(t * 2) * smoothedBass.current * 0.2;
    }
  });
  
  return (
    <group ref={groupRef}>
      <group ref={armsRef}>
        {spiralData.map((arm, armIndex) => (
          <group key={armIndex} rotation={[0, arm.angle, 0]}>
            {Array.from({ length: arm.particleCount }).map((_, i) => {
              const t = i / arm.particleCount;
              const radius = 0.3 + t * 2;
              const height = t * 1.5 - 0.75;
              const spiralAngle = t * Math.PI * 3;
              
              return (
                <mesh
                  key={i}
                  position={[
                    Math.cos(spiralAngle) * radius,
                    height,
                    Math.sin(spiralAngle) * radius,
                  ]}
                >
                  <sphereGeometry args={[0.04 + t * 0.02, 6, 6]} />
                  <meshStandardMaterial
                    color={colors.primary}
                    emissive={colors.primary}
                    emissiveIntensity={params.emissiveMin + t * 0.5}
                    transparent
                    opacity={0.8 - t * 0.3}
                  />
                </mesh>
              );
            })}
          </group>
        ))}
      </group>
      
      {/* Central core */}
      <mesh>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color={colors.accent}
          emissive={colors.accent}
          emissiveIntensity={params.emissiveMax}
        />
      </mesh>
      
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 0]} intensity={1.5} color={colors.accent} />
      <pointLight position={[3, 3, 3]} intensity={0.8} color={colors.primary} />
    </group>
  );
}

// ==================== RIBBON FORM ====================

function RibbonForm({ params, audioData, savedStyle }: AbstractFormRendererProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ribbonsRef = useRef<THREE.Group>(null);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  
  // FIX: Store audioData in ref to avoid stale closure in useFrame
  const audioDataRef = useRef(audioData);
  audioDataRef.current = audioData;
  
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const textureData = useVisualizerTexture();
  
  // Get colors - priority: savedStyle > textureData
  const colors = savedStyle?.colors || textureData.colors;
  
  useFrame(({ clock }) => {
    // Use ref to always get latest audioData
    const { bass, mids, highs } = analyzeAudio(audioDataRef.current.frequency);
    const sens = audioSensitivity;
    const t = clock.getElapsedTime();
    
    const bassEffect = applyReactivityCurve(bass * sens.bassMultiplier, params.bassReactivityCurve) * params.bassIntensity;
    const midsEffect = applyReactivityCurve(mids * sens.midsMultiplier, params.midsReactivityCurve) * params.midsIntensity;
    const highsEffect = applyReactivityCurve(highs * sens.highsMultiplier, params.highsReactivityCurve) * params.highsIntensity;
    
    smoothedBass.current = smoothValue(smoothedBass.current, bassEffect);
    smoothedMids.current = smoothValue(smoothedMids.current, midsEffect);
    smoothedHighs.current = smoothValue(smoothedHighs.current, highsEffect);
    
    if (groupRef.current) {
      groupRef.current.scale.setScalar(1.5 + smoothedBass.current * 0.4);
      // Rotation ONLY when spinSpeed > 0
      if (sens.spinSpeed > 0) {
        groupRef.current.rotation.y += sens.spinSpeed * (0.005 + smoothedMids.current * 0.02);
      }
    }
    
    if (ribbonsRef.current) {
      ribbonsRef.current.children.forEach((ribbon, i) => {
        // Wave motion along ribbon
        ribbon.rotation.x = Math.sin(t * 2 + i * 0.5) * (0.2 + smoothedMids.current * 0.3);
        ribbon.rotation.z = Math.cos(t * 1.5 + i * 0.3) * smoothedBass.current * 0.2;
        
        // Scale breathing
        const breathe = 1 + Math.sin(t * 3 + i) * smoothedBass.current * 0.1;
        ribbon.scale.setScalar(breathe);
      });
    }
  });
  
  return (
    <group ref={groupRef}>
      <group ref={ribbonsRef}>
        {Array.from({ length: params.ribbonCount }).map((_, i) => {
          const angle = (i / params.ribbonCount) * Math.PI * 2;
          const r = seededRandom(params.geometrySeed + i);
          
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.5, 0, Math.sin(angle) * 0.5]}
              rotation={[0, angle, r() * 0.5]}
            >
              <boxGeometry args={[0.02, 2 + r() * 1, 0.3 + r() * 0.3]} />
              <meshStandardMaterial
                color={colors.primary}
                emissive={colors.primary}
                emissiveIntensity={params.emissiveMin}
                transparent
                opacity={0.7}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })}
      </group>
      
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 3]} intensity={1.0} color={colors.primary} />
      <pointLight position={[-2, -2, 2]} intensity={0.6} color={colors.accent} />
    </group>
  );
}

// ==================== CRYSTALLINE FORM ====================

function CrystallineForm({ params, audioData, savedStyle }: AbstractFormRendererProps) {
  const groupRef = useRef<THREE.Group>(null);
  const shardsRef = useRef<THREE.Group>(null);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  
  // FIX: Store audioData in ref to avoid stale closure in useFrame
  const audioDataRef = useRef(audioData);
  audioDataRef.current = audioData;
  
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const textureData = useVisualizerTexture();
  
  // Get colors - priority: savedStyle > textureData
  const colors = savedStyle?.colors || textureData.colors;
  
  // Generate shard data
  const shards = useMemo(() => {
    const r = seededRandom(params.geometrySeed);
    const data: Array<{
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
    }> = [];
    
    for (let i = 0; i < params.crystalShardCount; i++) {
      const theta = r() * Math.PI * 2;
      const phi = Math.acos(2 * r() - 1);
      const radius = 0.5 + r() * 1;
      
      data.push({
        position: [
          Math.sin(phi) * Math.cos(theta) * radius,
          Math.sin(phi) * Math.sin(theta) * radius,
          Math.cos(phi) * radius,
        ],
        rotation: [r() * Math.PI, r() * Math.PI, r() * Math.PI],
        scale: [0.1 + r() * 0.15, 0.3 + r() * 0.5, 0.1 + r() * 0.15],
      });
    }
    
    return data;
  }, [params.geometrySeed, params.crystalShardCount]);
  
  useFrame(({ clock }) => {
    // Use ref to always get latest audioData
    const { bass, mids, highs } = analyzeAudio(audioDataRef.current.frequency);
    const sens = audioSensitivity;
    const t = clock.getElapsedTime();
    
    const bassEffect = applyReactivityCurve(bass * sens.bassMultiplier, params.bassReactivityCurve) * params.bassIntensity;
    const midsEffect = applyReactivityCurve(mids * sens.midsMultiplier, params.midsReactivityCurve) * params.midsIntensity;
    const highsEffect = applyReactivityCurve(highs * sens.highsMultiplier, params.highsReactivityCurve) * params.highsIntensity;
    
    smoothedBass.current = smoothValue(smoothedBass.current, bassEffect);
    smoothedMids.current = smoothValue(smoothedMids.current, midsEffect);
    smoothedHighs.current = smoothValue(smoothedHighs.current, highsEffect);
    
    if (groupRef.current) {
      groupRef.current.scale.setScalar(1.5 + smoothedBass.current * 0.5);
      // Rotation ONLY when spinSpeed > 0
      if (sens.spinSpeed > 0) {
        groupRef.current.rotation.y += sens.spinSpeed * (0.003 + smoothedMids.current * 0.01);
      }
    }
    
    if (shardsRef.current) {
      shardsRef.current.children.forEach((shard, i) => {
        const data = shards[i];
        if (!data) return;
        
        // BASS: Shards explode outward
        const explosionFactor = 1 + smoothedBass.current * 0.5;
        shard.position.set(
          data.position[0] * explosionFactor,
          data.position[1] * explosionFactor,
          data.position[2] * explosionFactor
        );
        
        // MIDS: Rotation
        shard.rotation.x = data.rotation[0] + t * 0.5 + smoothedMids.current * 0.5;
        shard.rotation.y = data.rotation[1] + t * 0.3;
        
        // HIGHS: Shimmer effect on material
        const mat = shard.children[0] as THREE.Mesh;
        if (mat && mat.material instanceof THREE.MeshStandardMaterial) {
          mat.material.emissiveIntensity = params.emissiveMin + smoothedHighs.current * 0.8;
        }
      });
    }
  });
  
  return (
    <group ref={groupRef}>
      <group ref={shardsRef}>
        {shards.map((shard, i) => (
          <group key={i} position={shard.position} rotation={shard.rotation}>
            <mesh scale={shard.scale}>
              <octahedronGeometry args={[1, 0]} />
              <meshStandardMaterial
                color={colors.primary}
                emissive={colors.primary}
                emissiveIntensity={params.emissiveMin}
                metalness={0.9}
                roughness={0.1}
                transparent
                opacity={0.8}
              />
            </mesh>
          </group>
        ))}
      </group>
      
      {/* Central crystal core */}
      <mesh>
        <octahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial
          color={colors.accent}
          emissive={colors.accent}
          emissiveIntensity={params.emissiveMax}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      <ambientLight intensity={0.3} />
      <pointLight position={[3, 3, 3]} intensity={1.2} color={colors.primary} />
      <pointLight position={[-2, -2, 2]} intensity={0.8} color={colors.accent} />
    </group>
  );
}

// ==================== SYMMETRY FORM ====================

function SymmetryForm({ params, audioData, savedStyle }: AbstractFormRendererProps) {
  const groupRef = useRef<THREE.Group>(null);
  const elementsRef = useRef<THREE.Group>(null);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  
  // FIX: Store audioData in ref to avoid stale closure in useFrame
  const audioDataRef = useRef(audioData);
  audioDataRef.current = audioData;
  
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const textureData = useVisualizerTexture();
  
  // Get colors - priority: savedStyle > textureData
  const colors = savedStyle?.colors || textureData.colors;
  
  useFrame(({ clock }) => {
    // Use ref to always get latest audioData
    const { bass, mids, highs } = analyzeAudio(audioDataRef.current.frequency);
    const sens = audioSensitivity;
    const t = clock.getElapsedTime();
    
    const bassEffect = applyReactivityCurve(bass * sens.bassMultiplier, params.bassReactivityCurve) * params.bassIntensity;
    const midsEffect = applyReactivityCurve(mids * sens.midsMultiplier, params.midsReactivityCurve) * params.midsIntensity;
    const highsEffect = applyReactivityCurve(highs * sens.highsMultiplier, params.highsReactivityCurve) * params.highsIntensity;
    
    smoothedBass.current = smoothValue(smoothedBass.current, bassEffect);
    smoothedMids.current = smoothValue(smoothedMids.current, midsEffect);
    smoothedHighs.current = smoothValue(smoothedHighs.current, highsEffect);
    
    if (groupRef.current) {
      groupRef.current.scale.setScalar(1.5 + smoothedBass.current * 0.5);
      
      // Rotation ONLY when spinSpeed > 0
      if (sens.spinSpeed > 0) {
        groupRef.current.rotation.y += sens.spinSpeed * (0.005 + smoothedMids.current * 0.02);
      }
    }
    
    if (elementsRef.current) {
      elementsRef.current.children.forEach((element, i) => {
        // Radial pulse with audio
        const pulsePhase = t * 2 + (i / params.symmetryFold) * Math.PI * 2;
        const pulseMag = 1 + Math.sin(pulsePhase) * smoothedMids.current * 0.2;
        element.scale.setScalar(pulseMag);
        
        // BASS: Elements move outward
        const baseRadius = 1 + smoothedBass.current * 0.5;
        const angle = (i / params.symmetryFold) * Math.PI * 2;
        element.position.x = Math.cos(angle) * baseRadius;
        element.position.z = Math.sin(angle) * baseRadius;
        
        // Individual rotation
        element.rotation.y = t * 0.5 + i * 0.2;
      });
    }
  });
  
  return (
    <group ref={groupRef}>
      <group ref={elementsRef}>
        {Array.from({ length: params.symmetryFold }).map((_, i) => {
          const angle = (i / params.symmetryFold) * Math.PI * 2;
          const radius = 1;
          
          return (
            <group 
              key={i} 
              position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
              rotation={[0, angle, 0]}
            >
              <mesh>
                <dodecahedronGeometry args={[0.2, 0]} />
                <meshStandardMaterial
                  color={colors.primary}
                  emissive={colors.primary}
                  emissiveIntensity={params.emissiveMin}
                  metalness={0.7}
                  roughness={0.3}
                />
              </mesh>
              
              {/* Connecting lines */}
              <mesh position={[radius * 0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.01, 0.01, radius, 4]} />
                <meshBasicMaterial color={colors.accent} transparent opacity={0.5} />
              </mesh>
            </group>
          );
        })}
      </group>
      
      {/* Central element */}
      <mesh>
        <icosahedronGeometry args={[0.2, 1]} />
        <meshStandardMaterial
          color={colors.accent}
          emissive={colors.accent}
          emissiveIntensity={params.emissiveMax}
        />
      </mesh>
      
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 3]} intensity={1.0} color={colors.primary} />
    </group>
  );
}

// ==================== TOPOLOGY FORM ====================

function TopologyForm({ params, audioData, savedStyle }: AbstractFormRendererProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const originalPositions = useRef<Float32Array | null>(null);
  
  const smoothedBass = useRef(0);
  const smoothedMids = useRef(0);
  const smoothedHighs = useRef(0);
  
  // FIX: Store audioData in ref to avoid stale closure in useFrame
  const audioDataRef = useRef(audioData);
  audioDataRef.current = audioData;
  
  const audioSensitivity = useStudioStore((s) => s.audioSensitivity);
  const textureData = useVisualizerTexture();
  
  // Get colors - priority: savedStyle > textureData
  const colors = savedStyle?.colors || textureData.colors;
  
  const material = useMemo(() => {
    const color = new THREE.Color(colors.primary);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: params.emissiveMin,
      metalness: 0.6,
      roughness: 0.4,
      wireframe: params.wireframeProbability > 0.5,
      side: THREE.DoubleSide,
    });
    
    // Apply texture if available
    if (textureData.texture) {
      mat.map = textureData.texture;
      mat.emissiveMap = textureData.texture;
      mat.needsUpdate = true;
    }
    
    return mat;
  }, [colors.primary, textureData.texture, textureData.textureVersion, params.emissiveMin, params.wireframeProbability]);
  
  useFrame(({ clock }) => {
    // Use ref to always get latest audioData
    const { bass, mids, highs } = analyzeAudio(audioDataRef.current.frequency);
    const sens = audioSensitivity;
    const t = clock.getElapsedTime();
    
    const bassEffect = applyReactivityCurve(bass * sens.bassMultiplier, params.bassReactivityCurve) * params.bassIntensity;
    const midsEffect = applyReactivityCurve(mids * sens.midsMultiplier, params.midsReactivityCurve) * params.midsIntensity;
    const highsEffect = applyReactivityCurve(highs * sens.highsMultiplier, params.highsReactivityCurve) * params.highsIntensity;
    
    smoothedBass.current = smoothValue(smoothedBass.current, bassEffect);
    smoothedMids.current = smoothValue(smoothedMids.current, midsEffect);
    smoothedHighs.current = smoothValue(smoothedHighs.current, highsEffect);
    
    // EXTREME topology deformation
    if (meshRef.current && meshRef.current.geometry) {
      const geometry = meshRef.current.geometry;
      const positions = geometry.attributes.position;
      
      if (!originalPositions.current) {
        originalPositions.current = new Float32Array(positions.array);
      }
      
      for (let i = 0; i < positions.count; i++) {
        const ox = originalPositions.current[i * 3];
        const oy = originalPositions.current[i * 3 + 1];
        const oz = originalPositions.current[i * 3 + 2];
        
        let x = ox, y = oy, z = oz;
        
        // BASS: Dramatic topology change
        switch (params.bassTopologyMode) {
          case 'warp':
            const warpFactor = smoothedBass.current * 0.8;
            x += Math.sin(oy * 3 + t) * warpFactor;
            z += Math.cos(oy * 3 + t) * warpFactor;
            break;
          case 'morph':
            const morphFactor = smoothedBass.current;
            const dist = Math.sqrt(ox * ox + oy * oy + oz * oz);
            const morph = Math.sin(dist * 4 - t * 2) * morphFactor * 0.3;
            x += (ox / dist) * morph;
            y += (oy / dist) * morph;
            z += (oz / dist) * morph;
            break;
          case 'ripple':
            const ripple = Math.sin(Math.sqrt(ox * ox + oz * oz) * 5 - t * 4) * smoothedBass.current * 0.3;
            y += ripple;
            break;
          case 'expand':
            const expand = 1 + smoothedBass.current * 0.5;
            x *= expand;
            y *= expand;
            z *= expand;
            break;
          case 'fracture':
            x += (Math.random() - 0.5) * smoothedBass.current * 0.2;
            y += (Math.random() - 0.5) * smoothedBass.current * 0.2;
            z += (Math.random() - 0.5) * smoothedBass.current * 0.2;
            break;
          case 'explode':
            const explodeDist = Math.sqrt(ox * ox + oy * oy + oz * oz);
            const explodeFactor = smoothedBass.current * 0.6;
            x += (ox / explodeDist) * explodeFactor;
            y += (oy / explodeDist) * explodeFactor;
            z += (oz / explodeDist) * explodeFactor;
            break;
        }
        
        // MIDS: Secondary motion
        switch (params.midsTopologyMode) {
          case 'wave':
            y += Math.sin(ox * 3 + t * 3) * smoothedMids.current * 0.15;
            break;
          case 'twist':
            const twistAngle = oy * smoothedMids.current * 0.5;
            const twistX = x * Math.cos(twistAngle) - z * Math.sin(twistAngle);
            const twistZ = x * Math.sin(twistAngle) + z * Math.cos(twistAngle);
            x = twistX;
            z = twistZ;
            break;
          case 'fold':
            if (y > 0) y += smoothedMids.current * 0.2;
            else y -= smoothedMids.current * 0.2;
            break;
          case 'oscillate':
            x += Math.sin(t * 5 + i * 0.1) * smoothedMids.current * 0.1;
            break;
          case 'pulse':
            const pulseFactor = 1 + Math.sin(t * 6) * smoothedMids.current * 0.1;
            x *= pulseFactor;
            y *= pulseFactor;
            z *= pulseFactor;
            break;
          case 'subdivide':
            // Simulate subdivision with noise
            x += simplex3D(ox * 5, oy * 5, t) * smoothedMids.current * 0.1;
            y += simplex3D(ox * 5 + 100, oy * 5, t) * smoothedMids.current * 0.1;
            break;
        }
        
        // HIGHS: Fine detail
        if (params.highsTopologyMode === 'jitter') {
          x += (Math.random() - 0.5) * smoothedHighs.current * 0.08;
          y += (Math.random() - 0.5) * smoothedHighs.current * 0.08;
          z += (Math.random() - 0.5) * smoothedHighs.current * 0.08;
        }
        
        positions.setXYZ(i, x, y, z);
      }
      
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
    }
    
    if (groupRef.current) {
      groupRef.current.scale.setScalar(1.5);
      // Rotation ONLY when spinSpeed > 0
      if (sens.spinSpeed > 0 && params.rotationAxes[1]) {
        groupRef.current.rotation.y += sens.spinSpeed * params.rotationSpeeds[1] * 0.01;
      }
    }
    
    if (material) {
      material.emissiveIntensity = params.emissiveMin + smoothedHighs.current * (params.emissiveMax - params.emissiveMin);
    }
  });
  
  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <torusKnotGeometry args={[0.8, 0.3, 128, 32]} />
        <primitive object={material} attach="material" />
      </mesh>
      
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 4]} intensity={1.2} color={colors.primary} />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color={colors.accent} />
    </group>
  );
}

// ==================== MAIN RENDERER ====================

export function AbstractFormRenderer({ params, audioData, savedStyle }: AbstractFormRendererProps) {
  // Apply saved style colors IMMEDIATELY and ALWAYS when loading a saved visualizer
  React.useEffect(() => {
    if (savedStyle?.colors) {
      // Always apply saved colors - this ensures they persist with the visualizer
      (window as any).extractedColors = savedStyle.colors;
      // Dispatch event to trigger texture data rebuild in all forms
      window.dispatchEvent(new CustomEvent('style:applied'));
    }
  }, [savedStyle]);
  
  switch (params.formFamily) {
    case 'lattice':
      return <LatticeForm params={params} audioData={audioData} savedStyle={savedStyle} />;
    case 'organic':
      return <OrganicForm params={params} audioData={audioData} savedStyle={savedStyle} />;
    case 'energy':
      return <EnergyForm params={params} audioData={audioData} savedStyle={savedStyle} />;
    case 'vortex':
      return <VortexForm params={params} audioData={audioData} savedStyle={savedStyle} />;
    case 'ribbon':
      return <RibbonForm params={params} audioData={audioData} savedStyle={savedStyle} />;
    case 'crystalline':
      return <CrystallineForm params={params} audioData={audioData} savedStyle={savedStyle} />;
    case 'symmetry':
      return <SymmetryForm params={params} audioData={audioData} savedStyle={savedStyle} />;
    case 'topology':
      return <TopologyForm params={params} audioData={audioData} savedStyle={savedStyle} />;
    default:
      return <LatticeForm params={params} audioData={audioData} savedStyle={savedStyle} />;
  }
}

export default AbstractFormRenderer;
