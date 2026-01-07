import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { VisualizerProps } from '../visualizer';
import { RandomVisualizerTemplate } from './RandomVisualizerTemplate';
import type { RandomVisualizerParams } from '@/lib/randomVisualizerGenerator';

// Legacy imports for backwards compatibility with old visualizers
import DynamicVisualizer from '../visualizer/DynamicVisualizer';
import VisualizerErrorBoundary from '../visualizer/VisualizerErrorBoundary';

interface CustomVisualizerLoaderProps extends VisualizerProps {
  visualizerKey?: string; // Format: "custom_{id}"
  initialCode?: string; // Legacy: Pre-loaded JSX code
  initialConfig?: RandomVisualizerParams; // New: Pre-loaded config
  isPlaying?: boolean; // Whether audio is playing
}

// Session-based cache to prevent flickering
const sessionCache = new Map<string, { config?: RandomVisualizerParams; code?: string }>();

export function CustomVisualizerLoader({ visualizerKey, initialCode, initialConfig, isPlaying, ...props }: CustomVisualizerLoaderProps) {
  const { user } = useAuth();
  const [config, setConfig] = useState<RandomVisualizerParams | null>(initialConfig || null);
  const [legacyCode, setLegacyCode] = useState<string>(initialCode || '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialConfig && !initialCode);
  const requestIdRef = useRef(0);

  const visualizerId = useMemo(() => {
    return visualizerKey ? visualizerKey.replace('custom_', '') : '';
  }, [visualizerKey]);

  const isValidUUID = (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  useEffect(() => {
    // Prioritize initialConfig (new system)
    if (initialConfig) {
      setConfig(initialConfig);
      sessionCache.set(visualizerId, { config: initialConfig });
      setIsLoading(false);
      setError(null);
      return;
    }

    // Fallback to initialCode (legacy system)
    if (initialCode) {
      setLegacyCode(initialCode);
      sessionCache.set(visualizerId, { code: initialCode });
      setIsLoading(false);
      setError(null);
      return;
    }

    // Check session cache
    const cached = sessionCache.get(visualizerId);
    if (cached) {
      if (cached.config) setConfig(cached.config);
      if (cached.code) setLegacyCode(cached.code);
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

        // Check for in-memory preview visualizer (legacy)
        const W = window as any;
        const previewMap = W.__PREVIEW_VISUALIZERS__ || {};
        if (previewMap[visualizerId]) {
          if (currentRequestId !== requestIdRef.current) return;
          
          const previewCode = previewMap[visualizerId];
          setLegacyCode(previewCode);
          sessionCache.set(visualizerId, { code: previewCode });
          setIsLoading(false);
          return;
        }

        if (!isValidUUID(visualizerId)) {
          setError('Invalid visualizer format');
          setIsLoading(false);
          return;
        }

        // Fetch from Supabase
        const { data, error: fetchError } = await supabase
          .from('custom_visualizers')
          .select('jsx_code, name')
          .eq('id', visualizerId)
          .maybeSingle();

        if (currentRequestId !== requestIdRef.current) return;

        if (fetchError) {
          setError('Failed to load visualizer');
          console.error('Error loading custom visualizer:', fetchError);
          setIsLoading(false);
          return;
        }

        if (!data) {
          setError(!user ? 'Sign in to view this visualizer' : 'Visualizer not found or no access');
          setIsLoading(false);
          return;
        }

        // Try to parse jsx_code as config JSON (new system) or use as code (legacy)
        if (data.jsx_code) {
          try {
            // New system: jsx_code contains JSON config
            const parsed = JSON.parse(data.jsx_code);
            if (parsed.seed !== undefined && parsed.baseShape) {
              setConfig(parsed as RandomVisualizerParams);
              sessionCache.set(visualizerId, { config: parsed });
            } else {
              throw new Error('Not a config object');
            }
          } catch {
            // Legacy system: jsx_code contains actual JSX
            setLegacyCode(data.jsx_code);
            sessionCache.set(visualizerId, { code: data.jsx_code });
          }
        } else {
          setError('No visualizer data found');
        }
      } catch (err) {
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
  }, [visualizerId, user?.id, initialCode, initialConfig]);

  if (isLoading) {
    return (
      <group scale={1}>
        <mesh>
          <boxGeometry args={[4, 4, 4]} />
          <meshBasicMaterial color="#666666" wireframe />
        </mesh>
      </group>
    );
  }

  if (error) {
    return (
      <group scale={1}>
        <mesh>
          <boxGeometry args={[4, 4, 4]} />
          <meshBasicMaterial color="#ff0000" wireframe />
        </mesh>
      </group>
    );
  }

  // New system: render from config params
  if (config) {
    return (
      <RandomVisualizerTemplate 
        params={config} 
        audioData={props.audioData}
        isPlaying={isPlaying}
      />
    );
  }

  // Legacy system: render from JSX code
  if (legacyCode) {
    return (
      <VisualizerErrorBoundary fallback={
        <group scale={0.25}>
          <mesh>
            <boxGeometry args={[2, 2, 2]} />
            <meshBasicMaterial color="#ff0000" wireframe />
          </mesh>
        </group>
      }>
        <DynamicVisualizer 
          jsxCode={legacyCode} 
          audioData={props.audioData}
          backgroundColor={props.backgroundColor}
          zoomLevel={props.zoomLevel}
          width={props.width}
          height={props.height}
        />
      </VisualizerErrorBoundary>
    );
  }

  // No data
  return (
    <group scale={1}>
      <mesh>
        <boxGeometry args={[4, 4, 4]} />
        <meshBasicMaterial color="#ff0000" wireframe />
      </mesh>
    </group>
  );
}
