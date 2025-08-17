import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { VisualizerProps } from '../visualizer';

interface CustomVisualizerLoaderProps extends VisualizerProps {
  visualizerKey?: string; // Format: "custom_{id}"
}

export function CustomVisualizerLoader({ visualizerKey, ...props }: CustomVisualizerLoaderProps) {
  const { user } = useAuth();
  const [CustomComponent, setCustomComponent] = useState<React.ComponentType<VisualizerProps> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const visualizerId = useMemo(() => {
    return visualizerKey ? visualizerKey.replace('custom_', '') : '';
  }, [visualizerKey]);

  useEffect(() => {
    const loadCustomVisualizer = async () => {
      if (!visualizerId || !user) {
        setError('Invalid visualizer or user not authenticated');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch the custom visualizer code from Supabase
        const { data, error } = await supabase
          .from('custom_visualizers')
          .select('jsx_code, name')
          .eq('id', visualizerId)
          .or(`user_id.eq.${user.id},is_public.eq.true`)
          .single();

        if (error) throw error;

        if (!data) {
          throw new Error('Custom visualizer not found');
        }

        // Create a dynamic React component from the JSX code
        // This is safe because we control the code generation and it comes from our own database
        const componentCode = data.jsx_code;
        
        // Create a function that returns the component
        const createComponent = new Function(
          'React',
          'useRef',
          'useMemo',
          'useFrame',
          'THREE',
          'useVisualizerTexture',
          'createVisualizerMaterial',
          'useStudioStore',
          `
          ${componentCode.replace('export default function', 'return function')}
          `
        );

        // Import the required dependencies
        const { useRef, useMemo } = React;
        const { useFrame } = await import('@react-three/fiber');
        const THREE = await import('three');
        const { useVisualizerTexture, createVisualizerMaterial } = await import('@/hooks/useVisualizerTexture');
        const { useStudioStore } = await import('@/stores/studioStore');

        // Create the component with all dependencies
        const CustomVisualizerComponent = createComponent(
          React,
          useRef,
          useMemo,
          useFrame,
          THREE,
          useVisualizerTexture,
          createVisualizerMaterial,
          useStudioStore
        );

        setCustomComponent(() => CustomVisualizerComponent);
      } catch (err) {
        console.error('Error loading custom visualizer:', err);
        setError(err instanceof Error ? err.message : 'Failed to load custom visualizer');
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomVisualizer();
  }, [visualizerId, user]);

  if (isLoading) {
    return (
      <group>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#666666" wireframe />
        </mesh>
      </group>
    );
  }

  if (error || !CustomComponent) {
    return (
      <group>
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshBasicMaterial color="#ff0000" wireframe />
        </mesh>
      </group>
    );
  }

  return <CustomComponent {...props} />;
}