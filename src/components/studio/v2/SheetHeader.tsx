import React from 'react';
import { X } from 'lucide-react';

/** Mobile bottom-sheet header: grab handle + title + close. */
export function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="shrink-0 pt-2">
      <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-hairline" />
      <div className="flex items-center justify-between px-5 pb-2 border-b border-hairline/40">
        <h3 className="text-text-primary text-sm font-semibold">{title}</h3>
        <button onClick={onClose} aria-label="Close" className="p-2 -mr-2 hover:bg-ai-red/[0.08] rounded-md transition-colors">
          <X className="w-5 h-5 text-text-tertiary" />
        </button>
      </div>
    </div>
  );
}
