import React, { useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateLocalVisualizer } from '@/components/studio/LocalVisualizerGenerator';

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

    const sanitize = (src: string) => {
      if (!src) return '';
      let c = String(src)
        .replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, ''))
        .replace(/export\s+default\s+/g, '')
        .replace(/import\s+.*?from\s+['"][^'"]+['"];?/g, '')
        .replace(/interface\s+\w+\s*{[^}]*}/g, '')
        .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')
        // Remove generic annotations like useRef<THREE.Mesh>()
        .replace(/\b([A-Za-z_$][\w$]*)<[^>]*>/g, '$1')
        // Remove TS "as Type" assertions
        .replace(/\s+as\s+[A-Za-z_$][\w$<>\[\]\|.,\s]*/g, '')
        // Remove parameter/var type annotations (avoid object literals by requiring type-like start)
        .replace(/:\s*(?:[A-Za-z_{][^,\)\n=]+)(?=[,\)\n=])/g, '')
        .trim();

      // Ensure we return a function from the factory
      if (!/^return\s/.test(c)) {
        if (/function\s+CustomVisualizer\b/.test(c)) {
          c += '\nreturn CustomVisualizer;';
        } else if (/^function\s+\w+/.test(c)) {
          c += '\nreturn (typeof CustomVisualizer !== \"undefined\" ? CustomVisualizer : null);';
        } else if (/^\(/.test(c) || /=>/.test(c)) {
          c = 'return (' + c + ');';
        } else if (!c.startsWith('return')) {
          // As a last resort, wrap it so we can "return" whatever it defines
          c = 'return (function(){' + c + '})();';
        }
      }
      return c;
    };

    const compile = (src: string) => {
      const factory = new Function('React', 'ReactThreeFiber', 'THREE', src);
      return factory(React, { useFrame }, THREE);
    };

    try {
      const cleanCode = sanitize(code);
      console.log('Sanitized code to execute:', cleanCode);
      const GeneratedComponent: any = compile(cleanCode);

      if (typeof GeneratedComponent !== 'function') {
        throw new Error('Generated code did not return a function');
      }

      const SafeComponent = (props: any) => {
        try {
          return <GeneratedComponent {...props} />;
        } catch (err) {
          console.error('Runtime error in custom visualizer:', err);
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
      console.error('Error creating component, falling back to local template:', err);

      try {
        const fallbackCode = generateLocalVisualizer('icosahedron');
        const cleanFallback = sanitize(fallbackCode);
        const FallbackComponent: any = compile(cleanFallback);
        if (typeof FallbackComponent === 'function') {
          setComponent(() => FallbackComponent);
          setError('');
          return;
        }
        throw new Error('Local fallback did not return a function');
      } catch (fallbackErr) {
        console.error('Local fallback failed:', fallbackErr);
        setError(fallbackErr instanceof Error ? fallbackErr.message : 'Unknown error');
        setComponent(() => FallbackVisualizer);
      }
    }
  }, [code]);

  if (error) {
    console.error('Rendering fallback due to error:', error);
    return <FallbackVisualizer audioData={audioData} />;
  }

  if (!Component) {
    return <LoadingVisualizer />;
  }

  // Don't scale - the generated visualizers already have proper sizing
  return (
    <Component 
      audioData={audioData}
      backgroundColor={backgroundColor}
      zoomLevel={zoomLevel}
    />
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