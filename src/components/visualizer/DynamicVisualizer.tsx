import React, { useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DynamicVisualizerProps {
  code: string;
  audioData: any;
  backgroundColor?: string;
  zoomLevel?: number;
}

export function DynamicVisualizer({ 
  code, 
  audioData, 
  backgroundColor = '#000000',
  zoomLevel = 1 
}: DynamicVisualizerProps) {
  const [Component, setComponent] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    try {
      // Clean the code
      let cleanCode = code
        .replace(/export\s+default\s+/g, '')
        .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
        .replace(/:\s*\w+(\[\])?/g, '') // Remove TypeScript types
        .trim();

      // Create a function that returns the component
      const createComponent = new Function(
        'React',
        'ReactThreeFiber',
        'THREE',
        cleanCode
      );

      // Execute with the required dependencies
      const GeneratedComponent = createComponent(
        React,
        { useFrame },
        THREE
      );

      // Wrap in error boundary
      const SafeComponent = (props: any) => {
        try {
          return <GeneratedComponent {...props} />;
        } catch (err) {
          console.error('Runtime error in custom visualizer:', err);
          // Return fallback white cube
          return (
            <>
              <ambientLight intensity={0.5} />
              <directionalLight position={[5, 5, 5]} intensity={1} />
              <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#ffffff" wireframe />
              </mesh>
            </>
          );
        }
      };

      setComponent(() => SafeComponent);
      setError('');
    } catch (err) {
      console.error('Error loading custom visualizer:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Set fallback component
      setComponent(() => FallbackVisualizer);
    }
  }, [code]);

  if (error) {
    return <FallbackVisualizer audioData={audioData} />;
  }

  if (!Component) {
    return <LoadingVisualizer />;
  }

  // Apply base scale of 0.25 to match other visualizers
  return (
    <group scale={0.25}>
      <Component 
        audioData={audioData}
        backgroundColor={backgroundColor}
        zoomLevel={zoomLevel}
      />
    </group>
  );
}

// Fallback visualizer (white wireframe cube)
function FallbackVisualizer({ audioData }: any) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = clock.getElapsedTime() * 0.5;
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          color="#ffffff" 
          wireframe 
          emissive="#ffffff"
          emissiveIntensity={0.1}
        />
      </mesh>
    </>
  );
}

// Loading state
function LoadingVisualizer() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>
    </>
  );
}