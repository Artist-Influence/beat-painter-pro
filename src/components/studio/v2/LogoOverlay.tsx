import React, { useState, useCallback, useEffect } from 'react';
import { useStudioStore } from '@/stores/studioStore';

export function LogoOverlay() {
  const { logo, setLogoPosition } = useStudioStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const container = document.getElementById('logo-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - dragOffset.x - rect.left) / rect.width) * 100;
    const y = ((e.clientY - dragOffset.y - rect.top) / rect.height) * 100;
    
    // Clamp to container bounds
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    
    setLogoPosition({ x: clampedX, y: clampedY });
  }, [isDragging, dragOffset, setLogoPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const getColorFilter = (mode: typeof logo.colorMode): string => {
    switch (mode) {
      case 'invert': return 'invert(1)';
      case 'light': return 'brightness(0) invert(1)';
      case 'dark': return 'brightness(0)';
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
        }}
        onMouseDown={handleMouseDown}
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
