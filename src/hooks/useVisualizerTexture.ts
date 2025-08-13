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
    const handleTextureApplied = () => setTextureVersion(v => v + 1);
    const handleTextureCleared = () => setTextureVersion(v => v + 1);
    const handleStyleApplied = () => setTextureVersion(v => v + 1);
    
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
  } = {}
) => {
  const material = new THREE.MeshStandardMaterial({
    color: baseColor,
    emissive: options.emissive || baseColor,
    emissiveIntensity: options.emissiveIntensity || 0.3,
    metalness: options.metalness || 0.8,
    roughness: options.roughness || 0.2,
    wireframe: options.wireframe || false,
    opacity: options.opacity || 1,
    transparent: options.transparent || false,
  });

  // Apply texture if available
  if (textureData.texture) {
    material.map = textureData.texture;
    material.emissiveMap = textureData.texture;
    material.needsUpdate = true;
  }

  return material;
};