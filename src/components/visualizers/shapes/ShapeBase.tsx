/**
 * Shared Shape Infrastructure
 * Common props, materials, and utilities for all shape components
 */

import * as THREE from 'three';
import type { VisualizerConfig } from '@/lib/visualizerFactory/config';
import type { MotionState } from '@/lib/visualizerFactory/motionGenerator';

/**
 * Standard props for all shape components
 */
export interface ShapeProps {
  config: VisualizerConfig;
  layoutPoints: THREE.Vector3[];
  audioData: {
    bass: number;
    mids: number;
    highs: number;
    rawBass: number;
    rawMids: number;
    rawHighs: number;
  };
  time: number;
  motionState: MotionState;
  audioSensitivity?: number;
}

/**
 * Neutral base materials for texture overlay compatibility
 * All shapes use white/gray only - textures handle color
 */
export const NEUTRAL_SOLID = {
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 0.08,
  metalness: 0.1,
  roughness: 0.7,
};

export const NEUTRAL_WIREFRAME = {
  color: 0xdddddd,
  wireframe: true,
  transparent: true,
  opacity: 0.85,
};

export const NEUTRAL_EMISSIVE = {
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 0.15,
  metalness: 0.2,
  roughness: 0.5,
};

/**
 * Simple 3D noise for vertex displacement
 */
export function simplex3D(x: number, y: number, z: number): number {
  const p = x * 0.5 + y * 0.8 + z * 0.3;
  return Math.sin(p * 2.1) * Math.cos(p * 1.7) * 0.5 + 0.5;
}

/**
 * Apply noise displacement to a position
 */
export function applyNoise(
  position: THREE.Vector3,
  time: number,
  strength: number,
  scale: number = 1
): THREE.Vector3 {
  const noise = simplex3D(
    position.x * scale + time * 0.5,
    position.y * scale + time * 0.3,
    position.z * scale + time * 0.4
  );
  const offset = (noise - 0.5) * strength;
  return new THREE.Vector3(
    position.x + offset,
    position.y + offset * 0.8,
    position.z + offset * 0.6
  );
}

/**
 * Clamp value to safe range
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Lerp between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Get icosahedron vertices for lattice structures
 */
export function getIcosahedronVertices(radius: number = 1): THREE.Vector3[] {
  const t = (1 + Math.sqrt(5)) / 2;
  const vertices = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
  ];
  const len = Math.sqrt(1 + t * t);
  return vertices.map(([x, y, z]) => 
    new THREE.Vector3((x / len) * radius, (y / len) * radius, (z / len) * radius)
  );
}

/**
 * Get dodecahedron vertices
 */
export function getDodecahedronVertices(radius: number = 1): THREE.Vector3[] {
  const phi = (1 + Math.sqrt(5)) / 2;
  const invPhi = 1 / phi;
  const vertices: number[][] = [];
  
  // Cube vertices
  for (let i = -1; i <= 1; i += 2) {
    for (let j = -1; j <= 1; j += 2) {
      for (let k = -1; k <= 1; k += 2) {
        vertices.push([i, j, k]);
      }
    }
  }
  
  // Rectangle vertices
  for (let i = -1; i <= 1; i += 2) {
    for (let j = -1; j <= 1; j += 2) {
      vertices.push([0, i * invPhi, j * phi]);
      vertices.push([i * invPhi, j * phi, 0]);
      vertices.push([i * phi, 0, j * invPhi]);
    }
  }
  
  return vertices.map(([x, y, z]) => {
    const len = Math.sqrt(x*x + y*y + z*z);
    return new THREE.Vector3((x/len) * radius, (y/len) * radius, (z/len) * radius);
  });
}

/**
 * Generate helix points
 */
export function generateHelixPoints(
  count: number,
  radius: number,
  height: number,
  turns: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const angle = t * turns * Math.PI * 2;
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      (t - 0.5) * height,
      Math.sin(angle) * radius
    ));
  }
  return points;
}

/**
 * Generate spiral arm points
 */
export function generateSpiralPoints(
  count: number,
  arms: number,
  maxRadius: number,
  spread: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const pointsPerArm = Math.floor(count / arms);
  
  for (let arm = 0; arm < arms; arm++) {
    const armAngle = (arm / arms) * Math.PI * 2;
    for (let i = 0; i < pointsPerArm; i++) {
      const t = i / pointsPerArm;
      const r = t * maxRadius;
      const angle = armAngle + t * spread;
      points.push(new THREE.Vector3(
        Math.cos(angle) * r,
        (Math.random() - 0.5) * 0.3,
        Math.sin(angle) * r
      ));
    }
  }
  return points;
}
