import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { VisualizerProps } from '../visualizer';
import DynamicVisualizer from '../visualizer/DynamicVisualizer';
import VisualizerErrorBoundary from '../visualizer/VisualizerErrorBoundary';

interface CustomVisualizerLoaderProps extends VisualizerProps {
  visualizerKey?: string; // Format: "custom_{id}"
  initialCode?: string; // Pre-loaded JSX code to prevent fetch
}

// Session-based cache to prevent flickering
const sessionCodeCache = new Map<string, string>();

export function CustomVisualizerLoader({ visualizerKey, initialCode, ...props }: CustomVisualizerLoaderProps) {
  const { user } = useAuth();
  const [code, setCode] = useState<string>(initialCode || '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialCode);
  const requestIdRef = useRef(0);

  const visualizerId = useMemo(() => {
    return visualizerKey ? visualizerKey.replace('custom_', '') : '';
  }, [visualizerKey]);

  // Check if visualizerId is a valid UUID
  const isValidUUID = (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  useEffect(() => {
    // If we have initial code, use it and don't fetch
    if (initialCode) {
      setCode(initialCode);
      sessionCodeCache.set(visualizerId, initialCode);
      setIsLoading(false);
      return;
    }

    // Check session cache first
    const cachedCode = sessionCodeCache.get(visualizerId);
    if (cachedCode) {
      setCode(cachedCode);
      setIsLoading(false);
      return;
    }

    const loadCustomVisualizer = async () => {
      if (!visualizerId) {
        setError('Invalid visualizer ID');
        setIsLoading(false);
        return;
      }

      const currentRequestId = ++requestIdRef.current;

      try {
        setIsLoading(true);
        setError(null);

        // 1) Check for in-memory preview visualizer first
        const W = window as any;
        const previewMap = W.__PREVIEW_VISUALIZERS__ || {};
        if (previewMap && previewMap[visualizerId]) {
          // Ignore if this is an outdated request
          if (currentRequestId !== requestIdRef.current) return;
          
          const previewCode = previewMap[visualizerId];
          setCode(previewCode);
          sessionCodeCache.set(visualizerId, previewCode);
          setIsLoading(false);
          return;
        }

        // 2) Only fetch from Supabase if visualizerId is a valid UUID
        if (!isValidUUID(visualizerId)) {
          setError('Invalid visualizer format');
          setIsLoading(false);
          return;
        }

        // Fetch from Supabase (RLS will handle permissions)
        const { data, error: fetchError } = await supabase
          .from('custom_visualizers')
          .select('jsx_code, name')
          .eq('id', visualizerId)
          .maybeSingle();

        // Ignore if this is an outdated request
        if (currentRequestId !== requestIdRef.current) return;

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
        sessionCodeCache.set(visualizerId, data.jsx_code);
      } catch (err) {
        // Ignore if this is an outdated request
        if (currentRequestId !== requestIdRef.current) return;
        
        console.error('Error loading custom visualizer:', err);
        setError('Failed to load visualizer');
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadCustomVisualizer();
  }, [visualizerId, user?.id, initialCode]);

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

  return (
    <VisualizerErrorBoundary fallback={
      <group scale={0.25}>
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshBasicMaterial color="#ff0000" wireframe />
        </mesh>
      </group>
    }>
      <DynamicVisualizer jsxCode={code} audioData={props.audioData.frequency} />
    </VisualizerErrorBoundary>
  );
}