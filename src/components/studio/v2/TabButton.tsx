import React from 'react';
import { motion } from 'framer-motion';

interface TabButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  side?: 'left' | 'right';
}

export function TabButton({ icon, label, isActive, onClick, side = 'left' }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center justify-center p-3 glass-panel !rounded-full transition-all transform hover:scale-110 ${
        isActive
          ? 'tab-on !border-ai-red/60 bg-ai-red/[0.12] shadow-glow'
          : 'glass-panel-interactive'
      }`}
      title={label}
    >
      <div className={`w-5 h-5 flex items-center justify-center ${isActive ? 'text-ai-red' : 'text-text-tertiary group-hover:text-text-secondary'}`}>
        {icon}
      </div>

      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileHover={{ opacity: 1, scale: 1 }}
        className={`absolute top-1/2 -translate-y-1/2 px-3 py-1 glass-panel text-xs text-text-tertiary whitespace-nowrap pointer-events-none ${
          side === 'left' ? 'left-16' : 'right-16'
        }`}
      >
        {label}
      </motion.div>
    </button>
  );
}