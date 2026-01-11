import { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';

export interface VisualizerTextureData {
  texture: THREE.Texture | null;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    isNeon: boolean;
    isMetallic: boolean;
  };
  textureVersion: number;
}

// GUARANTEED fallback colors - never use neon defaults
const DEFAULT_COLORS = {
  primary: "#8866ff",
  secondary: "#6644cc", 
  accent: "#aa88ff",
  isNeon: false,
  isMetallic: false,
};

export const useVisualizerTexture = () => {
  const [textureVersion, setTextureVersion] = useState(0);
  
  useEffect(() => {
    const handleUpdate = () => {
      setTextureVersion(v => v + 1);
    };
    
    window.addEventListener('texture:applied', handleUpdate);
    window.addEventListener('texture:cleared', handleUpdate);
    window.addEventListener('style:applied', handleUpdate);
    
    return () => {
      window.removeEventListener('texture:applied', handleUpdate);
      window.removeEventListener('texture:cleared', handleUpdate);
      window.removeEventListener('style:applied', handleUpdate);
    };
  }, []);

  // Read colors FRESH on every render (not memoized) to ensure we always have latest
  const extractedColors = (window as any).extractedColors || DEFAULT_COLORS;
  
  // Only memoize texture loading (expensive operation)
  const texture = useMemo(() => {
    const appliedTextureUrl = (window as any).appliedTexture;
    if (!appliedTextureUrl) return null;
    
    const tex = new THREE.TextureLoader().load(appliedTextureUrl);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, [textureVersion]);

  return {
    texture,
    colors: extractedColors,
    textureVersion,
  };
};

export const createVisualizerMaterial = (
  baseColor?: string,
  textureData?: VisualizerTextureData,
  options: {
    emissive?: string;
    emissiveIntensity?: number;
    metalness?: number;
    roughness?: number;
    wireframe?: boolean;
    opacity?: number;
    transparent?: boolean;
    basic?: boolean;
  } = {}
) => {
  // Defaults for backward compatibility
  const defaultColors = (window as any).extractedColors || {
    primary: '#ffffff',
    secondary: '#cccccc',
    accent: '#ffffff',
    isNeon: false,
    isMetallic: false,
  };
  const effectiveBase = baseColor || '#ffffff';
  const effectiveTextureData: VisualizerTextureData = textureData || {
    texture: (window as any).appliedTexture
      ? new THREE.TextureLoader().load((window as any).appliedTexture)
      : null,
    colors: defaultColors,
    textureVersion: 0,
  };

  if (effectiveTextureData.texture) {
    effectiveTextureData.texture.wrapS = THREE.RepeatWrapping;
    effectiveTextureData.texture.wrapT = THREE.RepeatWrapping;
    effectiveTextureData.texture.colorSpace = THREE.SRGBColorSpace;
    effectiveTextureData.texture.needsUpdate = true;
  }

  // Use MeshBasicMaterial for pure-white, lighting-independent mapping when requested
  const material: any = options.basic
    ? new THREE.MeshBasicMaterial({
        color: new THREE.Color(effectiveBase),
        wireframe: options.wireframe || false,
        opacity: options.opacity ?? 1,
        transparent: options.transparent ?? false,
      })
    : new THREE.MeshStandardMaterial({
        color: new THREE.Color(effectiveBase),
        emissive: new THREE.Color(options.emissive || effectiveBase),
        emissiveIntensity: options.emissiveIntensity || 0.3,
        metalness: options.metalness ?? 0.1,
        roughness: options.roughness ?? 0.9,
        wireframe: options.wireframe || false,
        opacity: options.opacity ?? 1,
        transparent: options.transparent ?? false,
      });

  // Apply texture if available
  if (effectiveTextureData.texture) {
    if (!options.basic && options.wireframe) {
      // For wireframe materials, we'll use emissive map to show texture
      (material as any).emissiveMap = effectiveTextureData.texture;
      (material as any).emissiveIntensity = Math.max(options.emissiveIntensity || 0.3, 0.8);
    } else {
      (material as any).map = effectiveTextureData.texture;
      if (!options.basic) (material as any).emissiveMap = effectiveTextureData.texture;
    }
    material.needsUpdate = true;
  }

  // Force material update when texture version changes
  (material as any).userData = { textureVersion: effectiveTextureData.textureVersion };

  return material;
};