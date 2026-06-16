import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { VisualizerProps } from '../visualizer';
import { RandomVisualizerTemplate } from './RandomVisualizerTemplate';
import { generateRandomParams, type RandomVisualizerParams } from '@/lib/randomVisualizerGenerator';

interface CustomVisualizerLoaderProps extends VisualizerProps {
  visualizerKey?: string; // Format: "custom_{id}"
  initialCode?: string; // Legacy raw-JSX rows — no longer executed (see note below)
  initialConfig?: RandomVisualizerParams; // Pre-loaded config (current format)
  isPlaying?: boolean; // Whether audio is playing
}

// Session-based cache to prevent flickering
const sessionCache = new Map<string, { config?: RandomVisualizerParams }>();

// SECURITY: older custom visualizers stored raw JSX in `jsx_code` and used to be
// compiled and run via `new Function(...)`. Because public rows are world-readable,
// that allowed one user's stored code to execute in another user's browser
// (stored XSS). We no longer execute raw code — only the deterministic, data-only
// config format is rendered; legacy raw-code rows fall back to a placeholder.
const LEGACY_UNSUPPORTED = 'legacy-unsupported';

export function CustomVisualizerLoader({ visualizerKey, initialCode, initialConfig, isPlaying, ...props }: CustomVisualizerLoaderProps) {
  const { user } = useAuth();
  const [config, setConfig] = useState<RandomVisualizerParams | null>(initialConfig || null);
  const [error, setError] = useState<string | null>(initialCode && !initialConfig ? LEGACY_UNSUPPORTED : null);
  const [isLoading, setIsLoading] = useState(!initialConfig && !initialCode);
  const requestIdRef = useRef(0);

  const visualizerId = useMemo(() => {
    return visualizerKey ? visualizerKey.replace('custom_', '') : '';
  }, [visualizerKey]);

  const isValidUUID = (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  // Create safe audio data - provides idle animation if no real audio
  const safeAudioData = useMemo(() => {
    const incoming = props.audioData;
    
    // Check if we have real audio data (non-zero frequencies)
    if (incoming?.frequency && incoming.frequency.some(v => v > 5)) {
      return incoming;
    }
    
    // Return idle animation values - keeps visualizer moving
    return {
      frequency: new Array(256).fill(0),
      amplitude: 0,
      beatStrength: 0,
    };
  }, [props.audioData]);

  useEffect(() => {
    // Prioritize initialConfig (current, data-only system)
    if (initialConfig) {
      setConfig(initialConfig);
      sessionCache.set(visualizerId, { config: initialConfig });
      setIsLoading(false);
      setError(null);
      return;
    }

    // Legacy raw-JSX rows are no longer executed — show the placeholder.
    if (initialCode) {
      setError(LEGACY_UNSUPPORTED);
      setIsLoading(false);
      return;
    }

    // Check session cache
    const cached = sessionCache.get(visualizerId);
    if (cached?.config) {
      setConfig(cached.config);
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

        if (!isValidUUID(visualizerId)) {
          setError('Invalid visualizer format');
          setIsLoading(false);
          return;
        }

        // Fetch from Supabase - select all fields needed
        console.log('CustomVisualizerLoader: Fetching from DB', { visualizerId, hasUser: !!user });
        
        const { data, error: fetchError } = await supabase
          .from('custom_visualizers')
          .select('jsx_code, name, scale_factor, config')
          .eq('id', visualizerId)
          .maybeSingle();

        if (currentRequestId !== requestIdRef.current) return;

        if (fetchError) {
          console.error('Error loading custom visualizer:', fetchError);
          setError('Failed to load visualizer');
          setIsLoading(false);
          return;
        }

        if (!data) {
          console.warn('Visualizer not found in DB:', { visualizerId, hasUser: !!user });
          setError(!user ? 'Sign in to view this visualizer' : 'Visualizer not found or no access');
          setIsLoading(false);
          return;
        }
        
        console.log('CustomVisualizerLoader: Loaded from DB', { name: data.name });

        // Try to parse jsx_code as config JSON (new system) or use as code (legacy)
        if (data.jsx_code) {
          try {
            const parsed = JSON.parse(data.jsx_code);
            
            // NEW: Check for seed-only format (current save format)
            if (parsed.seed !== undefined && !parsed.baseShape) {
              // Regenerate full config from seed (deterministic)
              const regeneratedParams = generateRandomParams(parsed.seed);
              
              // Merge saved style colors if present
              if (parsed.savedStyle) {
                regeneratedParams.savedStyle = parsed.savedStyle;
              }
              
              setConfig(regeneratedParams);
              sessionCache.set(visualizerId, { config: regeneratedParams });
            }
            // EXISTING: Check for full config format (legacy saves)
            else if (parsed.seed !== undefined && parsed.baseShape) {
              setConfig(parsed as RandomVisualizerParams);
              sessionCache.set(visualizerId, { config: parsed });
            } 
            else {
              throw new Error('Not a config object');
            }
          } catch {
            // Legacy row with raw JSX (not config JSON) — no longer executed.
            setError(LEGACY_UNSUPPORTED);
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

  // Current system: render from config params with safe audio data
  if (config) {
    return (
      <RandomVisualizerTemplate
        params={config}
        audioData={safeAudioData}
        isPlaying={isPlaying}
      />
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
