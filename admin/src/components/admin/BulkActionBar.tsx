import type { ReactNode } from 'react';

interface BulkActionBarProps {
  count: number;
  children: ReactNode;
  onClear: () => void;
}

export default function BulkActionBar({ count, children, onClear }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant/35 bg-surface-container-low p-3">
      <p className="text-sm font-medium text-on-surface">{count} selected</p>
      <div className="flex items-center gap-2">
        {children}
        <button
          className="px-3 py-1 rounded text-xs border border-outline-variant/40 text-on-surface hover:bg-surface-container-high transition-colors"
          onClick={onClear}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
