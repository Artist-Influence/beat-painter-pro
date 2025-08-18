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
    console.log('Loading custom visualizer with code:', code);
    
    try {
      // Clean the code more thoroughly
      let cleanCode = code
        .replace(/export\s+default\s+/g, '')
        .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
        .replace(/:\s*\w+(\[\])?/g, '') // Remove TypeScript types
        .replace(/interface\s+\w+\s*{[^}]*}/g, '') // Remove interfaces
        .replace(/type\s+\w+\s*=.*?;/g, '') // Remove type definitions
        .trim();

      console.log('Cleaned code:', cleanCode);

      // Create the component function
      const createComponent = new Function(
        'React',
        'ReactThreeFiber',
        'THREE',
        cleanCode
      );

      // Execute with dependencies
      const GeneratedComponent = createComponent(
        React,
        { useFrame },
        THREE
      );

      console.log('Generated component:', GeneratedComponent);

      // Test if it's a valid function
      if (typeof GeneratedComponent !== 'function') {
        throw new Error('Generated code did not return a function');
      }

      // Wrap in error boundary with better error handling
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
      console.error('Error creating component:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Set fallback component
      setComponent(() => FallbackVisualizer);
    }
  }, [code]);

  if (error) {
    console.error('Rendering fallback due to error:', error);
    return (
      <group scale={0.25}>
        <FallbackVisualizer audioData={audioData} />
      </group>
    );
  }

  if (!Component) {
    return (
      <group scale={0.25}>
        <LoadingVisualizer />
      </group>
    );
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