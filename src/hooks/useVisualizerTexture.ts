import { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';

interface VisualizerTextureData {
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

export const useVisualizerTexture = () => {
  const [textureVersion, setTextureVersion] = useState(0);
  
  useEffect(() => {
    const handleTextureApplied = () => {
      console.log('Texture applied event fired');
      setTextureVersion(v => v + 1);
    };
    const handleTextureCleared = () => {
      console.log('Texture cleared event fired');
      setTextureVersion(v => v + 1);
    };
    const handleStyleApplied = () => {
      console.log('Style applied event fired');
      setTextureVersion(v => v + 1);
    };
    
    window.addEventListener('texture:applied', handleTextureApplied);
    window.addEventListener('texture:cleared', handleTextureCleared);
    window.addEventListener('style:applied', handleStyleApplied);
    
    return () => {
      window.removeEventListener('texture:applied', handleTextureApplied);
      window.removeEventListener('texture:cleared', handleTextureCleared);
      window.removeEventListener('style:applied', handleStyleApplied);
    };
  }, []);

  const textureData: VisualizerTextureData = useMemo(() => {
    const appliedTextureUrl = (window as any).appliedTexture;
    const extractedColors = (window as any).extractedColors || {
      primary: "#ff00ff",
      secondary: "#cccccc", 
      accent: "#00ffff",
      isNeon: false,
      isMetallic: false,
    };

    let texture = null;
    if (appliedTextureUrl) {
      texture = new THREE.TextureLoader().load(appliedTextureUrl);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    }

    return {
      texture,
      colors: extractedColors,
      textureVersion,
    };
  }, [textureVersion]);

  return textureData;
};

export const createVisualizerMaterial = (
  baseColor: string,
  textureData: VisualizerTextureData,
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
  // Use MeshBasicMaterial for pure-white, lighting-independent mapping when requested
  const material: any = options.basic
    ? new THREE.MeshBasicMaterial({
        color: new THREE.Color(baseColor),
        wireframe: options.wireframe || false,
        opacity: options.opacity ?? 1,
        transparent: options.transparent ?? false,
      })
    : new THREE.MeshStandardMaterial({
        color: new THREE.Color(baseColor),
        emissive: new THREE.Color(options.emissive || baseColor),
        emissiveIntensity: options.emissiveIntensity || 0.3,
        metalness: options.metalness ?? 0.1,
        roughness: options.roughness ?? 0.9,
        wireframe: options.wireframe || false,
        opacity: options.opacity ?? 1,
        transparent: options.transparent ?? false,
      });

  // Apply texture if available
  if (textureData.texture) {
    if (!options.basic && options.wireframe) {
      // For wireframe materials, we'll use emissive map to show texture
      (material as any).emissiveMap = textureData.texture;
      (material as any).emissiveIntensity = Math.max(options.emissiveIntensity || 0.3, 0.8);
    } else {
      (material as any).map = textureData.texture;
      if (!options.basic) (material as any).emissiveMap = textureData.texture;
    }
    material.needsUpdate = true;
  }

  // Force material update when texture version changes
  (material as any).userData = { textureVersion: textureData.textureVersion };

  return material;
};