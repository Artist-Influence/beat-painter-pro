/**
 * Layout Generators
 * Generate position arrays for different layout formations
 */

import type { LayoutFormation } from './modules';
import type { LayoutParams } from './config';
import { createRNG } from './rng';
import * as THREE from 'three';

export interface LayoutPoint {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  index: number;
}

/**
 * Golden ratio for Fibonacci layouts
 */
const PHI = (1 + Math.sqrt(5)) / 2;

/**
 * Generate layout positions for a given formation
 */
export function generateLayoutPositions(
  formation: LayoutFormation,
  count: number,
  params: LayoutParams,
  seed: number
): LayoutPoint[] {
  const rng = createRNG(seed);
  const points: LayoutPoint[] = [];
  
  switch (formation) {
    case 'centered_single':
      return [{
        position: new THREE.Vector3(0, params.offsetY, 0),
        rotation: new THREE.Euler(0, params.rotationOffset, 0),
        scale: 1,
        index: 0,
      }];
      
    case 'spherical_shell':
      for (let i = 0; i < count; i++) {
        const phi = Math.acos(1 - 2 * (i + 0.5) / count);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        
        const x = params.radius * Math.sin(phi) * Math.cos(theta);
        const y = params.radius * Math.cos(phi) + params.offsetY;
        const z = params.radius * Math.sin(phi) * Math.sin(theta);
        
        points.push({
          position: new THREE.Vector3(x, y, z),
          rotation: new THREE.Euler(phi, theta, 0),
          scale: rng.float(0.8, 1.2) * params.spread,
          index: i,
        });
      }
      break;
      
    case 'double_ring':
      const rings = 2;
      const perRing = Math.ceil(count / rings);
      for (let ring = 0; ring < rings; ring++) {
        const ringRadius = params.radius * (0.6 + ring * 0.4);
        const ringY = params.offsetY + (ring - 0.5) * params.spread;
        
        for (let i = 0; i < perRing && points.length < count; i++) {
          const angle = (i / perRing) * Math.PI * 2 + params.rotationOffset;
          points.push({
            position: new THREE.Vector3(
              Math.cos(angle) * ringRadius,
              ringY,
              Math.sin(angle) * ringRadius
            ),
            rotation: new THREE.Euler(0, angle, 0),
            scale: rng.float(0.85, 1.15),
            index: points.length,
          });
        }
      }
      break;
      
    case 'vertical_stack':
      const layers = Math.ceil(Math.sqrt(count));
      const perLayer = Math.ceil(count / layers);
      for (let layer = 0; layer < layers; layer++) {
        const y = params.offsetY + (layer - layers / 2) * params.spread * 0.8;
        const layerRadius = params.radius * (1 - Math.abs(layer - layers / 2) / layers * 0.3);
        
        for (let i = 0; i < perLayer && points.length < count; i++) {
          const angle = (i / perLayer) * Math.PI * 2 + layer * 0.2;
          points.push({
            position: new THREE.Vector3(
              Math.cos(angle) * layerRadius,
              y,
              Math.sin(angle) * layerRadius
            ),
            rotation: new THREE.Euler(0, angle, 0),
            scale: rng.float(0.8, 1.2),
            index: points.length,
          });
        }
      }
      break;
      
    case 'orbital_planes':
      const planes = 3;
      const perPlane = Math.ceil(count / planes);
      for (let plane = 0; plane < planes; plane++) {
        const planeAngle = (plane / planes) * Math.PI;
        
        for (let i = 0; i < perPlane && points.length < count; i++) {
          const orbitAngle = (i / perPlane) * Math.PI * 2;
          const r = params.radius;
          
          // Rotate around different axes for each plane
          const pos = new THREE.Vector3(
            Math.cos(orbitAngle) * r,
            0,
            Math.sin(orbitAngle) * r
          );
          pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), planeAngle);
          pos.y += params.offsetY;
          
          points.push({
            position: pos,
            rotation: new THREE.Euler(planeAngle, orbitAngle, 0),
            scale: rng.float(0.85, 1.15),
            index: points.length,
          });
        }
      }
      break;
      
    case 'fibonacci_spiral':
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = i * PHI * Math.PI * 2;
        const r = params.radius * Math.sqrt(t) * params.spread;
        const y = params.offsetY + (t - 0.5) * params.spread * 2;
        
        points.push({
          position: new THREE.Vector3(
            Math.cos(angle) * r,
            y,
            Math.sin(angle) * r
          ),
          rotation: new THREE.Euler(0, angle, t * Math.PI),
          scale: 0.5 + t * 0.8,
          index: i,
        });
      }
      break;
      
    case 'cube_corners':
      const cubeSize = params.radius;
      const corners = [
        [-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1],
      ];
      for (let i = 0; i < Math.min(count, 8); i++) {
        const [x, y, z] = corners[i];
        points.push({
          position: new THREE.Vector3(
            x * cubeSize,
            y * cubeSize + params.offsetY,
            z * cubeSize
          ),
          rotation: new THREE.Euler(rng.float(0, Math.PI), rng.float(0, Math.PI), 0),
          scale: rng.float(0.9, 1.1),
          index: i,
        });
      }
      // Add more points at edge midpoints if needed
      if (count > 8) {
        const edges = [
          [0, 1], [2, 3], [4, 5], [6, 7], // horizontal edges
          [0, 2], [1, 3], [4, 6], [5, 7], // vertical edges
          [0, 4], [1, 5], [2, 6], [3, 7], // depth edges
        ];
        for (let i = 8; i < count && i - 8 < edges.length; i++) {
          const [a, b] = edges[i - 8];
          const [ax, ay, az] = corners[a];
          const [bx, by, bz] = corners[b];
          points.push({
            position: new THREE.Vector3(
              ((ax + bx) / 2) * cubeSize,
              ((ay + by) / 2) * cubeSize + params.offsetY,
              ((az + bz) / 2) * cubeSize
            ),
            rotation: new THREE.Euler(rng.float(0, Math.PI), rng.float(0, Math.PI), 0),
            scale: rng.float(0.7, 0.9),
            index: i,
          });
        }
      }
      break;
      
    case 'icosahedron_vertices':
      const t = (1 + Math.sqrt(5)) / 2;
      const icoVerts = [
        [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
      ];
      const icoScale = params.radius / Math.sqrt(1 + t * t);
      for (let i = 0; i < Math.min(count, 12); i++) {
        const [x, y, z] = icoVerts[i];
        points.push({
          position: new THREE.Vector3(
            x * icoScale,
            y * icoScale + params.offsetY,
            z * icoScale
          ),
          rotation: new THREE.Euler(rng.float(0, Math.PI), rng.float(0, Math.PI), 0),
          scale: rng.float(0.9, 1.1),
          index: i,
        });
      }
      break;
      
    case 'random_cloud':
      for (let i = 0; i < count; i++) {
        // Spherical random distribution
        const u = rng.float(0, 1);
        const v = rng.float(0, 1);
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = params.radius * Math.cbrt(rng.float(0.3, 1)) * params.spread;
        
        points.push({
          position: new THREE.Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.cos(phi) + params.offsetY,
            r * Math.sin(phi) * Math.sin(theta)
          ),
          rotation: new THREE.Euler(rng.float(0, Math.PI * 2), rng.float(0, Math.PI * 2), 0),
          scale: rng.float(0.6, 1.4),
          index: i,
        });
      }
      break;
      
    case 'grid_3d':
      const gridSize = Math.ceil(Math.cbrt(count));
      const spacing = (params.radius * 2) / gridSize;
      const offset = -params.radius + spacing / 2;
      
      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          for (let z = 0; z < gridSize && points.length < count; z++) {
            points.push({
              position: new THREE.Vector3(
                offset + x * spacing,
                offset + y * spacing + params.offsetY,
                offset + z * spacing
              ),
              rotation: new THREE.Euler(0, 0, 0),
              scale: rng.float(0.8, 1.0),
              index: points.length,
            });
          }
        }
      }
      break;
      
    case 'tunnel':
      const tunnelRings = Math.ceil(count / 8);
      const tunnelDepth = params.radius * 2;
      
      for (let ring = 0; ring < tunnelRings; ring++) {
        const z = (ring / tunnelRings) * tunnelDepth - tunnelDepth / 2;
        const ringCount = 8;
        
        for (let i = 0; i < ringCount && points.length < count; i++) {
          const angle = (i / ringCount) * Math.PI * 2 + ring * 0.1;
          points.push({
            position: new THREE.Vector3(
              Math.cos(angle) * params.radius,
              Math.sin(angle) * params.radius + params.offsetY,
              z
            ),
            rotation: new THREE.Euler(0, 0, angle),
            scale: rng.float(0.85, 1.15),
            index: points.length,
          });
        }
      }
      break;
      
    case 'explosion':
      for (let i = 0; i < count; i++) {
        // Radial burst
        const theta = rng.float(0, Math.PI * 2);
        const phi = rng.float(0, Math.PI);
        const r = params.radius * rng.float(0.5, 1.5) * params.spread;
        
        // Add some clustering at origin
        const clusterFactor = rng.float(0, 1);
        const actualR = r * (0.3 + clusterFactor * 0.7);
        
        points.push({
          position: new THREE.Vector3(
            actualR * Math.sin(phi) * Math.cos(theta),
            actualR * Math.cos(phi) + params.offsetY,
            actualR * Math.sin(phi) * Math.sin(theta)
          ),
          rotation: new THREE.Euler(phi, theta, 0),
          scale: rng.float(0.6, 1.2) * (1 - clusterFactor * 0.3),
          index: i,
        });
      }
      break;
  }
  
  return points;
}
