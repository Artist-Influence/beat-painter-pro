
import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useStudioStore } from '@/stores/studioStore';
import * as THREE from 'three';

interface DynamicVisualizerProps {
  jsxCode: string;
  audioData: number[];
  scaleFactor?: number;
}

// Enhanced sanitization and transformation function
const transformJSXCode = (code: string): string => {
  let transformed = code;
  
  // Remove imports and exports to make code executable
  transformed = transformed.replace(/^import\s+.*$/gm, '');
  transformed = transformed.replace(/^export\s+.*$/gm, '');
  
  // Transform export default function to return function
  const exportMatch = transformed.match(/export\s+default\s+function\s+(\w+)/);
  if (exportMatch) {
    const functionName = exportMatch[1];
    transformed = transformed.replace(/export\s+default\s+function\s+\w+/, `function ${functionName}`);
    transformed = transformed + `\nreturn ${functionName};`;
  }
  
  // Remove any color specifications to enforce all-white materials
  transformed = transformed.replace(/color\s*[:=]\s*["'][^"']*["']/g, '');
  transformed = transformed.replace(/\bcolor\s*=\s*{[^}]*}/g, '');
  
  // Replace material components with createVisualizerMaterial
  transformed = transformed.replace(/<meshStandardMaterial[^>]*\/?>/g, '<primitive object={material} />');
  transformed = transformed.replace(/<meshBasicMaterial[^>]*\/?>/g, '<primitive object={material} />');
  transformed = transformed.replace(/<meshPhongMaterial[^>]*\/?>/g, '<primitive object={material} />');
  transformed = transformed.replace(/<meshLambertMaterial[^>]*\/?>/g, '<primitive object={material} />');
  
  // Ensure createVisualizerMaterial is properly used
  if (!transformed.includes('createVisualizerMaterial')) {
    const materialDeclaration = 'const material = createVisualizerMaterial();';
    const insertIndex = transformed.indexOf('return (');
    if (insertIndex !== -1) {
      transformed = transformed.slice(0, insertIndex) + materialDeclaration + '\n  \n  ' + transformed.slice(insertIndex);
    }
  }
  
  return transformed;
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
      
      // Import necessary dependencies
      const useRef = React.useRef;
      const useMemo = React.useMemo;
      const { useFrame } = require('@react-three/fiber');
      const { useStudioStore } = require('@/stores/studioStore');
      const { createVisualizerMaterial } = require('@/lib/visualizerUtils');
      
      return componentFunction(
        React,
        useRef,
        useMemo,
        useFrame,
        useStudioStore,
        createVisualizerMaterial,
        THREE
      );
    } catch (error) {
      console.error('Error creating dynamic visualizer:', error);
      
      // Fallback component with all-white material
      return ({ audioData }: { audioData: number[] }) => {
        const meshRef = React.useRef<THREE.Mesh>(null);
        const { useFrame } = require('@react-three/fiber');
        const { createVisualizerMaterial } = require('@/lib/visualizerUtils');
        
        useFrame(() => {
          if (meshRef.current && audioData.length > 0) {
            const avgFreq = audioData.reduce((a, b) => a + b, 0) / audioData.length;
            meshRef.current.scale.setScalar(1 + avgFreq * 0.5);
            meshRef.current.rotation.y += 0.01;
          }
        });
        
        const material = createVisualizerMaterial();
        
        return (
          <mesh ref={meshRef}>
            <sphereGeometry args={[2, 32, 32]} />
            <primitive object={material} />
          </mesh>
        );
      };
    }
  }, [jsxCode]);

  return (
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
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />
        
        <Suspense fallback={null}>
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
  );
};

export default DynamicVisualizer;
