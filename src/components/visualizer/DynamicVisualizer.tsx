import React, { Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useStudioStore } from '@/stores/studioStore';
import * as THREE from 'three';
import VisualizerErrorBoundary from './VisualizerErrorBoundary';
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

  // Remove imports and exports to make code executable
  transformed = transformed.replace(/^import\s+.*$/gm, '');
  transformed = transformed.replace(/^export\s+.*$/gm, '');

  // Transform `export default function Name` to named function and return it
  const exportMatch = transformed.match(/export\s+default\s+function\s+(\w+)/);
  if (exportMatch) {
    const functionName = exportMatch[1];
    transformed = transformed.replace(/export\s+default\s+function\s+\w+/, `function ${functionName}`);
    transformed = transformed + `\nreturn ${functionName};`;
  }

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

  // Fix THREE.js references
  transformed = transformed.replace(/THREE\./g, '');

  // Replace any capitalized JSX elements (e.g., <Button />) and namespaced/dotted ones with groups
  transformed = transformed.replace(/<([A-Z][A-Za-z0-9_.-]*)\b([^>]*)\/>/g, '<group$2 />');
  transformed = transformed.replace(/<([A-Z][A-Za-z0-9_.-]*)\b([^>]*)>/g, '<group$2>');
  transformed = transformed.replace(/<\/(?:[A-Z][A-Za-z0-9_.-]*)>/g, '</group>');

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
  // Guard against leftover capitalized JSX elements (e.g., <Button> or <UI.Button>)
  if (/<[A-Z][A-Za-z0-9_.-]*/.test(code)) {
    throw new Error('Unsupported JSX component inside Canvas');
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
      
      return componentFunction(
        React,
        useRef,
        localUseMemo,
        useFrame,
        useStudioStore,
        createVisualizerMaterial,
        THREE
      );
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
    <VisualizerErrorBoundary>
      <div className="w-full h-full">
        <Canvas
          camera={{ position: [0, 0, 10], fov: 75 }}
          gl={{ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
          }}
          style={{ background: backgroundColor }}
          onCreated={({ gl }) => {
            gl.setClearColor(backgroundColor);
          }}
          onError={(error) => {
            console.error('Canvas error:', error);
          }}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={0.8} />
          <pointLight position={[-10, -10, -10]} intensity={0.3} />
          
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
          
          <OrbitControls 
            enableZoom={true}
            enablePan={true}
            enableRotate={true}
            maxDistance={50}
            minDistance={2}
          />
        </Canvas>
      </div>
    </VisualizerErrorBoundary>
  );
};

export default DynamicVisualizer;