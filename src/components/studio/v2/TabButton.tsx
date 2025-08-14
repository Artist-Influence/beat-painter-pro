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
      className={`relative p-3 backdrop-blur-xl rounded-full border transition-all transform hover:scale-110 ${
        isActive 
          ? 'bg-purple-600/90 border-purple-500/50 shadow-lg shadow-purple-600/30' 
          : 'bg-black/40 border-white/10 hover:bg-white/10'
      }`}
      title={label}
    >
      <div className="w-6 h-6 text-white">
        {icon}
      </div>
      
      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileHover={{ opacity: 1, scale: 1 }}
        className={`absolute top-1/2 -translate-y-1/2 px-3 py-1 bg-black/80 backdrop-blur-xl rounded-lg border border-white/10 text-xs text-white/80 whitespace-nowrap pointer-events-none ${
          side === 'left' ? 'left-16' : 'right-16'
        }`}
      >
        {label}
      </motion.div>
    </button>
  );
}