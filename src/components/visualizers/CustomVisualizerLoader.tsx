import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { VisualizerProps } from '../visualizer';
import DynamicVisualizer from '../visualizer/DynamicVisualizer';

interface CustomVisualizerLoaderProps extends VisualizerProps {
  visualizerKey?: string; // Format: "custom_{id}"
}

export function CustomVisualizerLoader({ visualizerKey, ...props }: CustomVisualizerLoaderProps) {
  const { user } = useAuth();
  const [code, setCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const visualizerId = useMemo(() => {
    return visualizerKey ? visualizerKey.replace('custom_', '') : '';
  }, [visualizerKey]);

  useEffect(() => {
    const loadCustomVisualizer = async () => {
      if (!visualizerId) {
        setError('Invalid visualizer ID');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // 1) Check for in-memory preview visualizer first
        const W = window as any;
        const previewMap = W.__PREVIEW_VISUALIZERS__ || {};
        if (previewMap && previewMap[visualizerId]) {
          setCode(previewMap[visualizerId]);
          setIsLoading(false);
          return;
        }

        // 2) Fetch from Supabase (RLS will handle permissions)
        const { data, error: fetchError } = await supabase
          .from('custom_visualizers')
          .select('jsx_code, name')
          .eq('id', visualizerId)
          .maybeSingle();

        if (fetchError) {
          setError('Failed to load visualizer');
          console.error('Error loading custom visualizer:', fetchError);
          setIsLoading(false);
          return;
        }

        if (!data?.jsx_code) {
          setError(!user ? 'Sign in to view this visualizer' : 'Visualizer not found or no access');
          setIsLoading(false);
          return;
        }

        setCode(data.jsx_code);
      } catch (err) {
        console.error('Error loading custom visualizer:', err);
        setError('Failed to load visualizer');
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomVisualizer();
  }, [visualizerId, user?.id]);

  if (isLoading) {
    return (
      <group scale={0.25}>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#666666" wireframe />
        </mesh>
      </group>
    );
  }

  if (error || !code) {
    return (
      <group scale={0.25}>
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshBasicMaterial color="#ff0000" wireframe />
        </mesh>
      </group>
    );
  }

  return <DynamicVisualizer jsxCode={code} audioData={props.audioData.frequency} />;
}