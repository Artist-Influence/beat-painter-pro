import React, { useState, useCallback, useEffect } from 'react';
import { useStudioStore } from '@/stores/studioStore';

export function LogoOverlay() {
  const { logo, setLogoPosition } = useStudioStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Pointer events (not mouse) so dragging the logo works on touch devices too -
  // the UI advertises "drag on screen to position", which was previously dead on mobile.
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging) return;

    const container = document.getElementById('logo-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - dragOffset.x - rect.left) / rect.width) * 100;
    const y = ((e.clientY - dragOffset.y - rect.top) / rect.height) * 100;

    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    setLogoPosition({ x: clampedX, y: clampedY });
  }, [isDragging, dragOffset, setLogoPosition]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setLogoPosition({ x: 50, y: 50 });
  }, [setLogoPosition]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const getColorFilter = (mode: typeof logo.colorMode): string => {
    switch (mode) {
      case 'invert': return 'invert(1)';
      default: return 'none';
    }
  };

  if (!logo.url) return null;

  return (
    <div
      id="logo-container"
      className="absolute inset-0 pointer-events-none"
    >
      <div
        className="absolute pointer-events-auto cursor-move select-none"
        style={{
          left: `${logo.position.x}%`,
          top: `${logo.position.y}%`,
          transform: 'translate(-50%, -50%)',
          opacity: logo.opacity / 100,
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
      >
        <img 
          src={logo.url} 
          alt="Logo overlay"
          style={{ 
            width: `${logo.size}px`,
            filter: getColorFilter(logo.colorMode),
          }}
          draggable={false}
          className="max-w-none"
        />
      </div>
    </div>
  );
}
