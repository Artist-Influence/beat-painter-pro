
import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useStudioStore } from '@/stores/studioStore';

interface DynamicVisualizerProps {
  jsxCode: string;
  audioData: number[];
  scaleFactor?: number;
}

// Enhanced sanitization function for all-white materials
const sanitizeJSXCode = (code: string): string => {
  let sanitized = code;
  
  // Remove any color specifications
  sanitized = sanitized.replace(/color\s*[:=]\s*["'][^"']*["']/g, '');
  sanitized = sanitized.replace(/\bcolor\s*=\s*{[^}]*}/g, '');
  
  // Replace material components with createVisualizerMaterial
  sanitized = sanitized.replace(/<meshStandardMaterial[^>]*\/?>/g, '<primitive object={material} />');
  sanitized = sanitized.replace(/<meshBasicMaterial[^>]*\/?>/g, '<primitive object={material} />');
  sanitized = sanitized.replace(/<meshPhongMaterial[^>]*\/?>/g, '<primitive object={material} />');
  sanitized = sanitized.replace(/<meshLambertMaterial[^>]*\/?>/g, '<primitive object={material} />');
  
  // Ensure createVisualizerMaterial is properly used
  if (!sanitized.includes('createVisualizerMaterial')) {
    const materialDeclaration = 'const material = createVisualizerMaterial();';
    const insertIndex = sanitized.indexOf('return (');
    if (insertIndex !== -1) {
      sanitized = sanitized.slice(0, insertIndex) + materialDeclaration + '\n  \n  ' + sanitized.slice(insertIndex);
    }
  }
  
  return sanitized;
};

const DynamicVisualizer: React.FC<DynamicVisualizerProps> = ({ 
  jsxCode, 
  audioData, 
  scaleFactor = 1 
}) => {
  const backgroundColor = useStudioStore((state) => state.backgroundColor);
  
  const VisualizerComponent = useMemo(() => {
    try {
      const sanitizedCode = sanitizeJSXCode(jsxCode);
      
      // Create the component function from the sanitized JSX code
      const componentFunction = new Function(
        'React',
        'useRef',
        'useMemo',
        'useFrame',
        'useStudioStore',
        'createVisualizerMaterial',
        `${sanitizedCode}; return arguments[5].default || arguments[5];`
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
        createVisualizerMaterial
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
