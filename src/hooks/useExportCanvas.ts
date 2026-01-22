/**
 * useExportCanvas
 * Manages dedicated export canvas with explicit sizing
 */

import { useRef, useCallback } from 'react';

export type AspectRatio = 'square' | 'vertical' | 'horizontal';
export type ExportQuality = '1080p' | '4k' | '8k';

interface ExportDimensions {
  width: number;
  height: number;
}

const RESOLUTIONS: Record<ExportQuality, Record<AspectRatio, ExportDimensions>> = {
  '1080p': {
    horizontal: { width: 1920, height: 1080 },
    vertical: { width: 1080, height: 1920 },
    square: { width: 1080, height: 1080 },
  },
  '4k': {
    horizontal: { width: 3840, height: 2160 },
    vertical: { width: 2160, height: 3840 },
    square: { width: 2160, height: 2160 },
  },
  '8k': {
    horizontal: { width: 7680, height: 4320 },
    vertical: { width: 4320, height: 7680 },
    square: { width: 4320, height: 4320 },
  },
};

interface ExportCanvasConfig {
  aspectRatio: AspectRatio;
  quality: ExportQuality;
}

interface ExportCanvasResult {
  getDimensions: (config: ExportCanvasConfig) => ExportDimensions;
  createExportCanvas: (config: ExportCanvasConfig) => HTMLCanvasElement;
  getAspectRatioValue: (aspectRatio: AspectRatio) => number;
}

export function useExportCanvas(): ExportCanvasResult {
  const canvasCache = useRef<Map<string, HTMLCanvasElement>>(new Map());
  
  const getDimensions = useCallback((config: ExportCanvasConfig): ExportDimensions => {
    return RESOLUTIONS[config.quality][config.aspectRatio];
  }, []);
  
  const getAspectRatioValue = useCallback((aspectRatio: AspectRatio): number => {
    switch (aspectRatio) {
      case 'square': return 1;
      case 'vertical': return 9 / 16;
      case 'horizontal': return 16 / 9;
    }
  }, []);
  
  const createExportCanvas = useCallback((config: ExportCanvasConfig): HTMLCanvasElement => {
    const key = `${config.quality}-${config.aspectRatio}`;
    
    // Check cache first
    const cached = canvasCache.current.get(key);
    if (cached) {
      return cached;
    }
    
    // Create new canvas with exact dimensions
    const { width, height } = getDimensions(config);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.id = `export-canvas-${key}`;
    
    // Cache it
    canvasCache.current.set(key, canvas);
    
    return canvas;
  }, [getDimensions]);
  
  return {
    getDimensions,
    createExportCanvas,
    getAspectRatioValue,
  };
}

/**
 * Get export dimensions for given config
 */
export function getExportDimensions(
  quality: ExportQuality,
  aspectRatio: AspectRatio
): ExportDimensions {
  return RESOLUTIONS[quality][aspectRatio];
}

/**
 * Aspect ratio display names
 */
export const ASPECT_RATIO_LABELS: Record<AspectRatio, string> = {
  horizontal: '16:9 Landscape',
  vertical: '9:16 Portrait',
  square: '1:1 Square',
};
