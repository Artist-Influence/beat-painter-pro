/**
 * Motion Generators
 * Apply motion patterns to visualizer groups
 */

import type { MotionPattern } from './modules';
import type { MotionParams } from './config';
import * as THREE from 'three';

export interface MotionState {
  time: number;
  groupRotation: THREE.Euler;
  groupPosition: THREE.Vector3;
  groupScale: number;
  elementOffsets: Float32Array; // Per-element animation offsets
}

/**
 * Initialize motion state
 */
export function createMotionState(elementCount: number): MotionState {
  return {
    time: 0,
    groupRotation: new THREE.Euler(0, 0, 0),
    groupPosition: new THREE.Vector3(0, 0, 0),
    groupScale: 1,
    elementOffsets: new Float32Array(elementCount * 3),
  };
}

/**
 * Update motion state based on pattern
 */
export function updateMotionState(
  state: MotionState,
  pattern: MotionPattern,
  params: MotionParams,
  delta: number,
  audioMultiplier: number = 1
): MotionState {
  state.time += delta;
  const t = state.time;
  const { speed, intensity, phaseOffset, secondarySpeed, damping } = params;
  const effectiveSpeed = speed * (1 + audioMultiplier * 0.5);
  
  switch (pattern) {
    case 'static':
      // No base motion, audio only affects scale
      state.groupScale = 1;
      break;
      
    case 'spin_y':
      state.groupRotation.y = t * effectiveSpeed + phaseOffset;
      break;
      
    case 'spin_tumble':
      state.groupRotation.x = t * effectiveSpeed * 0.3 + phaseOffset;
      state.groupRotation.y = t * effectiveSpeed + phaseOffset;
      state.groupRotation.z = t * effectiveSpeed * 0.2;
      break;
      
    case 'orbit':
      // Elements orbit, group stays put but may rotate slowly
      state.groupRotation.y = t * effectiveSpeed * 0.2;
      break;
      
    case 'breathe':
      const breathePhase = Math.sin(t * effectiveSpeed + phaseOffset);
      state.groupScale = 1 + breathePhase * intensity;
      break;
      
    case 'wave_propagate':
      // Wave motion handled per-element
      state.groupRotation.y = t * secondarySpeed * 0.1;
      break;
      
    case 'oscillate_xz':
      state.groupPosition.x = Math.sin(t * effectiveSpeed + phaseOffset) * intensity;
      state.groupPosition.z = Math.cos(t * effectiveSpeed * 0.7) * intensity * 0.7;
      break;
      
    case 'spiral_in_out':
      const spiralPhase = Math.sin(t * effectiveSpeed * 0.3);
      state.groupScale = 1 + spiralPhase * intensity * 0.3;
      state.groupRotation.y = t * effectiveSpeed + phaseOffset;
      break;
      
    case 'bounce':
      const bounceY = Math.abs(Math.sin(t * effectiveSpeed + phaseOffset));
      state.groupPosition.y = bounceY * intensity;
      break;
      
    case 'pendulum':
      const pendulumAngle = Math.sin(t * effectiveSpeed + phaseOffset) * intensity;
      state.groupRotation.z = pendulumAngle;
      state.groupRotation.x = pendulumAngle * 0.3;
      break;
      
    case 'flutter':
      // High-frequency micro movements
      state.groupPosition.x = Math.sin(t * effectiveSpeed * 3) * intensity * 0.1;
      state.groupPosition.y = Math.sin(t * effectiveSpeed * 2.7 + 1) * intensity * 0.1;
      state.groupPosition.z = Math.sin(t * effectiveSpeed * 2.3 + 2) * intensity * 0.1;
      break;
      
    case 'drift':
      // Slow, smooth wandering
      state.groupPosition.x = Math.sin(t * effectiveSpeed) * intensity;
      state.groupPosition.y = Math.sin(t * effectiveSpeed * 0.7 + 1) * intensity * 0.5;
      state.groupPosition.z = Math.sin(t * effectiveSpeed * 0.5 + 2) * intensity;
      break;
  }
  
  return state;
}

/**
 * Get per-element motion offset for wave-like effects
 */
export function getElementMotionOffset(
  pattern: MotionPattern,
  params: MotionParams,
  elementIndex: number,
  elementCount: number,
  position: THREE.Vector3,
  time: number
): THREE.Vector3 {
  const offset = new THREE.Vector3(0, 0, 0);
  const { speed, intensity, phaseOffset } = params;
  
  // Phase offset based on position for wave effects
  const positionPhase = (position.x + position.y + position.z) * 0.5;
  const indexPhase = (elementIndex / elementCount) * Math.PI * 2;
  
  switch (pattern) {
    case 'orbit':
      // Each element orbits its position
      const orbitAngle = time * speed + indexPhase + phaseOffset;
      offset.x = Math.sin(orbitAngle) * intensity * 0.2;
      offset.z = Math.cos(orbitAngle) * intensity * 0.2;
      break;
      
    case 'wave_propagate':
      // Wave travels through the structure
      const wavePhase = time * speed + positionPhase + phaseOffset;
      offset.y = Math.sin(wavePhase) * intensity;
      break;
      
    case 'flutter':
      // Each element flutters independently
      const flutterPhase = indexPhase + phaseOffset;
      offset.x = Math.sin(time * speed * 3 + flutterPhase) * intensity * 0.1;
      offset.y = Math.sin(time * speed * 2.7 + flutterPhase + 1) * intensity * 0.1;
      offset.z = Math.sin(time * speed * 2.3 + flutterPhase + 2) * intensity * 0.1;
      break;
      
    case 'spiral_in_out':
      // Spiral motion per element
      const spiralAngle = time * speed + indexPhase;
      const spiralRadius = Math.sin(time * speed * 0.3) * intensity * 0.2;
      offset.x = Math.cos(spiralAngle) * spiralRadius;
      offset.z = Math.sin(spiralAngle) * spiralRadius;
      break;
  }
  
  return offset;
}

/**
 * Apply audio-reactive scaling to motion intensity
 */
export function applyAudioToMotion(
  baseIntensity: number,
  bass: number,
  mids: number,
  audioMultiplier: number
): number {
  // Bass adds punch, mids add flow
  return baseIntensity * (1 + bass * audioMultiplier * 0.5 + mids * audioMultiplier * 0.3);
}
