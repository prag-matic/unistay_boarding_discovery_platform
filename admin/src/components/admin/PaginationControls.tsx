interface PaginationControlsProps {
  page: number;
  totalPages: number;
  loading?: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function PaginationControls({
  page,
  totalPages,
  loading = false,
  onPrev,
  onNext,
}: PaginationControlsProps) {
  return (
    <div className="flex gap-2">
      <button
        className="px-3 py-1 bg-surface-container-lowest border border-outline-variant/40 rounded text-xs text-on-surface hover:bg-surface-container-low transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/60 disabled:cursor-not-allowed"
        disabled={page <= 1 || loading}
        onClick={onPrev}
      >
        Previous
      </button>
      <button
        className="px-3 py-1 bg-surface-container-lowest border border-outline-variant/40 rounded text-xs text-on-surface hover:bg-surface-container-low transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/60 disabled:cursor-not-allowed"
        disabled={page >= totalPages || loading}
        onClick={onNext}
      >
        Next
      </button>
    </div>
  );
}
