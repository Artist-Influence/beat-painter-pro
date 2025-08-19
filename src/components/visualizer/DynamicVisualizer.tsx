import React, { Suspense, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStudioStore } from '@/stores/studioStore';
import * as THREE from 'three';
import { createVisualizerMaterial } from '@/lib/visualizerUtils';

interface DynamicVisualizerProps {
  jsxCode: string;
  audioData: number[];
  scaleFactor?: number;
}

// Enhanced sanitization and transformation function
const transformJSXCode = (code: string): string => {
  let transformed = code;

  // Strip code fences if present
  transformed = transformed.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');

  // Handle export default BEFORE stripping export lines
  const exportFuncMatch = transformed.match(/export\s+default\s+function\s+(\w+)/);
  if (exportFuncMatch) {
    const functionName = exportFuncMatch[1];
    transformed = transformed.replace(/export\s+default\s+function\s+\w+/, `function ${functionName}`);
    transformed = transformed + `\nreturn ${functionName};`;
  } else {
    const exportRefMatch = transformed.match(/export\s+default\s+([A-Za-z_$][\w$]*)/);
    if (exportRefMatch) {
      const refName = exportRefMatch[1];
      transformed = transformed + `\nreturn ${refName};`;
    }
  }

  // Now remove imports and exports to make code executable
  transformed = transformed.replace(/^import\s+.*$/gm, '');
  transformed = transformed.replace(/^export\s+.*$/gm, '');

  // Remove TypeScript generics and param types often present in templates
  transformed = transformed.replace(/useRef<[^>]+>\(/g, 'useRef(');
  transformed = transformed.replace(/useMemo<[^>]+>\(/g, 'useMemo(');
  transformed = transformed.replace(/\(\{\s*audioData\s*\}\)\s*:\s*\{[^}]+\}/g, '({ audioData })');

  // Enforce all-white materials by replacing material tags with our material instance
  transformed = transformed.replace(/<meshStandardMaterial[^>]*\/?>(?:<\/meshStandardMaterial>)?/g, '<primitive object={material} />');
  transformed = transformed.replace(/<meshBasicMaterial[^>]*\/?>(?:<\/meshBasicMaterial>)?/g, '<primitive object={material} />');
  transformed = transformed.replace(/<meshPhongMaterial[^>]*\/?>(?:<\/meshPhongMaterial>)?/g, '<primitive object={material} />');
  transformed = transformed.replace(/<meshLambertMaterial[^>]*\/?>(?:<\/meshLambertMaterial>)?/g, '<primitive object={material} />');
  transformed = transformed.replace(/<meshPhysicalMaterial[^>]*\/?>(?:<\/meshPhysicalMaterial>)?/g, '<primitive object={material} />');

  // Remove any color specifications to enforce all-white materials
  transformed = transformed.replace(/color\s*[:=]\s*["'][^"']*["']/g, '');
  transformed = transformed.replace(/\bcolor\s*=\s*\{[^}]*\}/g, '');

  // Convert common HTML elements to groups (HTML isn't allowed inside Canvas)
  transformed = transformed.replace(/<\/?(div|span|button|p|img|video|canvas)(\s|>)/gi, (m) => {
    return m.replace(/(div|span|button|p|img|video|canvas)/i, 'group');
  });

  // Preserve THREE namespace references (no replacements)

  // Replace any capitalized JSX elements (e.g., <Button />) and namespaced/dotted ones with groups
  transformed = transformed.replace(/<([A-Z][A-Za-z0-9_.-]*)\b([^>]*)\/>/g, '<group$2 />');
  transformed = transformed.replace(/<([A-Z][A-Za-z0-9_.-]*)\b([^>]*)>/g, '<group$2>');
  transformed = transformed.replace(/<\/(?:[A-Z][A-Za-z0-9_.-]*)>/g, '</group>');

  // Replace any non-allowed lowercase tags with <group> to ensure Canvas-safe JSX
  const allowed = new Set([
    'group','mesh','instancedMesh',
    'boxGeometry','sphereGeometry','cylinderGeometry','coneGeometry','torusGeometry','planeGeometry','torusKnotGeometry','dodecahedronGeometry','icosahedronGeometry',
    'primitive','ambientLight','pointLight','directionalLight','spotLight','hemisphereLight','line','lineSegments','points','pointsMaterial'
  ]);
  transformed = transformed
    .replace(/<([a-z][A-Za-z0-9_.-]*)\b([^>]*)\/>/g, (m, name, attrs) => allowed.has(name) ? m : `<group${attrs} />`)
    .replace(/<([a-z][A-Za-z0-9_.-]*)\b([^>]*)>/g, (m, name, attrs) => allowed.has(name) ? m : `<group${attrs}>`)
    .replace(/<\/(?:[a-z][A-Za-z0-9_.-]*)>/g, (m) => {
      const nm = m.slice(2, -1);
      return allowed.has(nm) ? m : '</group>';
    });

  // Ensure createVisualizerMaterial is properly used
  if (!transformed.includes('createVisualizerMaterial')) {
    const materialDeclaration = 'const material = createVisualizerMaterial("#ffffff", { texture: null, colors: { primary: "#ffffff", secondary: "#ffffff", accent: "#ffffff", isNeon: false, isMetallic: false }, textureVersion: 0 });';
    const insertIndex = transformed.indexOf('return (');
    if (insertIndex !== -1) {
      transformed = transformed.slice(0, insertIndex) + materialDeclaration + '\n\n  ' + transformed.slice(insertIndex);
    }
  } else if (!/const\s+material\s*=\s*createVisualizerMaterial\(/.test(transformed)) {
    // If function is referenced but instance not created, create it
    const insertIndex = transformed.indexOf('return (');
    if (insertIndex !== -1) {
      transformed = transformed.slice(0, insertIndex) + 'const material = createVisualizerMaterial("#ffffff", { texture: null, colors: { primary: "#ffffff", secondary: "#ffffff", accent: "#ffffff", isNeon: false, isMetallic: false }, textureVersion: 0 });' + '\n\n  ' + transformed.slice(insertIndex);
    }
  }

  return transformed;
};

// Lightweight runtime validator to prevent obvious crashes
const validateJSX = (code: string) => {
  const forbidden = [/document\./i, /window\./i, /fetch\(/i, /<canvas/i];
  const htmlTags = ['div','span','button','input','select','textarea','img','video','canvas'];
  for (const rx of forbidden) {
    if (rx.test(code)) throw new Error('Forbidden APIs used in visualizer code');
  }
  for (const tag of htmlTags) {
    if (new RegExp(`<\\/?${tag}\\b`, 'i').test(code)) {
      throw new Error('HTML elements are not allowed inside the 3D Canvas');
    }
  }
};

const DynamicVisualizer: React.FC<DynamicVisualizerProps> = ({ 
  jsxCode, 
  audioData, 
  scaleFactor = 1 
}) => {
  const backgroundColor = useStudioStore((state) => state.backgroundColor);
  
  const VisualizerComponent = useMemo(() => {
    try {
      const transformedCode = transformJSXCode(jsxCode);
      validateJSX(transformedCode);

      // Helpful dev logging
      if (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'development') {
        // eslint-disable-next-line no-console
        console.debug('DynamicVisualizer transformed code:', transformedCode);
      }
      
      // Create the component function from the transformed JSX code
      const componentFunction = new Function(
        'React',
        'useRef',
        'useMemo',
        'useFrame',
        'useStudioStore',
        'createVisualizerMaterial',
        'THREE',
        transformedCode
      );
      
      // Provide necessary dependencies
      const useRef = React.useRef;
      const localUseMemo = React.useMemo;
      
      const result = componentFunction(
        React,
        useRef,
        localUseMemo,
        useFrame,
        useStudioStore,
        createVisualizerMaterial,
        THREE
      );

      if (typeof result !== 'function') {
        throw new Error('Invalid visualizer component output');
      }

      return result as React.FC<{ audioData: number[] }>;

    } catch (error) {
      console.error('Error creating dynamic visualizer:', error);
      
      // Fallback component with all-white material and error indicator
      return ({ audioData }: { audioData: number[] }) => {
        const meshRef = React.useRef<THREE.Mesh>(null);
        
        useFrame(() => {
          if (meshRef.current && audioData.length > 0) {
            const avgFreq = audioData.reduce((a, b) => a + b, 0) / audioData.length;
            meshRef.current.scale.setScalar(1 + avgFreq * 0.5);
            meshRef.current.rotation.y += 0.01;
          }
        });
        
        const material = createVisualizerMaterial('#ffffff', { 
          texture: null, 
          colors: {
            primary: '#ffffff', 
            secondary: '#ffffff', 
            accent: '#ffffff', 
            isNeon: false, 
            isMetallic: false
          }, 
          textureVersion: 0 
        });
        
        return (
          <group>
            <mesh ref={meshRef}>
              <sphereGeometry args={[2, 32, 32]} />
              <primitive object={material} />
            </mesh>
            {/* Error indicator - red wireframe cube */}
            <mesh position={[0, 4, 0]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#ff0000" wireframe />
            </mesh>
          </group>
        );
      };
    }
  }, [jsxCode]);

  return (
    <Suspense fallback={
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#666666" wireframe />
      </mesh>
    }>
      <group scale={scaleFactor}>
        <VisualizerComponent audioData={audioData} />
      </group>
    </Suspense>
  );
};

export default DynamicVisualizer;