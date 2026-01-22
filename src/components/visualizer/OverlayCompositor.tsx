/**
 * OverlayCompositor
 * Applies visual style overlay (texture/gradient) to the scene
 * Uses a post-process approach with full-screen quad
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type BlendMode = 'normal' | 'screen' | 'multiply' | 'overlay' | 'add' | 'soft-light';

interface OverlayCompositorProps {
  enabled: boolean;
  textureUrl?: string | null;
  blendMode?: BlendMode;
  opacity?: number;
}

// Custom shader for blend modes
const overlayShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D tOverlay;
    uniform float opacity;
    uniform int blendMode;
    varying vec2 vUv;
    
    vec3 blendScreen(vec3 base, vec3 blend) {
      return 1.0 - (1.0 - base) * (1.0 - blend);
    }
    
    vec3 blendMultiply(vec3 base, vec3 blend) {
      return base * blend;
    }
    
    vec3 blendOverlay(vec3 base, vec3 blend) {
      return mix(
        2.0 * base * blend,
        1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
        step(0.5, base)
      );
    }
    
    vec3 blendAdd(vec3 base, vec3 blend) {
      return min(base + blend, 1.0);
    }
    
    vec3 blendSoftLight(vec3 base, vec3 blend) {
      return mix(
        2.0 * base * blend + base * base * (1.0 - 2.0 * blend),
        sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
        step(0.5, blend)
      );
    }
    
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      vec4 overlay = texture2D(tOverlay, vUv);
      
      vec3 result = base.rgb;
      
      if (blendMode == 1) { // screen
        result = blendScreen(base.rgb, overlay.rgb);
      } else if (blendMode == 2) { // multiply
        result = blendMultiply(base.rgb, overlay.rgb);
      } else if (blendMode == 3) { // overlay
        result = blendOverlay(base.rgb, overlay.rgb);
      } else if (blendMode == 4) { // add
        result = blendAdd(base.rgb, overlay.rgb);
      } else if (blendMode == 5) { // soft-light
        result = blendSoftLight(base.rgb, overlay.rgb);
      } else { // normal
        result = mix(base.rgb, overlay.rgb, overlay.a);
      }
      
      gl_FragColor = vec4(mix(base.rgb, result, opacity * overlay.a), base.a);
    }
  `,
};

const BLEND_MODE_MAP: Record<BlendMode, number> = {
  'normal': 0,
  'screen': 1,
  'multiply': 2,
  'overlay': 3,
  'add': 4,
  'soft-light': 5,
};

/**
 * Simple overlay using a transparent plane in front of the scene
 * This approach is simpler than post-processing and works well for static overlays
 */
export function OverlayCompositor({ 
  enabled, 
  textureUrl, 
  blendMode = 'screen',
  opacity = 0.5 
}: OverlayCompositorProps) {
  const { scene } = useThree();
  const textureRef = useRef<THREE.Texture | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Load texture when URL changes
  useEffect(() => {
    if (!enabled || !textureUrl) {
      textureRef.current = null;
      return;
    }
    
    const loader = new THREE.TextureLoader();
    loader.load(
      textureUrl,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        textureRef.current = texture;
      },
      undefined,
      (error) => {
        console.warn('Failed to load overlay texture:', error);
        textureRef.current = null;
      }
    );
    
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, [enabled, textureUrl]);
  
  // Create overlay material
  const material = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: opacity,
      depthTest: false,
      depthWrite: false,
    });
    
    // Set blending based on mode
    switch (blendMode) {
      case 'screen':
        mat.blending = THREE.AdditiveBlending;
        break;
      case 'multiply':
        mat.blending = THREE.MultiplyBlending;
        break;
      case 'add':
        mat.blending = THREE.AdditiveBlending;
        break;
      default:
        mat.blending = THREE.NormalBlending;
    }
    
    return mat;
  }, [blendMode, opacity]);
  
  // Update material when texture loads
  useFrame(() => {
    if (meshRef.current && material) {
      if (textureRef.current && enabled) {
        material.map = textureRef.current;
        material.needsUpdate = true;
        material.visible = true;
      } else {
        material.visible = false;
      }
      material.opacity = opacity;
    }
  });
  
  if (!enabled) return null;
  
  return (
    <mesh 
      ref={meshRef}
      position={[0, 0, 4]} // In front of scene
      renderOrder={999}
    >
      <planeGeometry args={[20, 20]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export default OverlayCompositor;
